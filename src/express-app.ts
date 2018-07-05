import * as express from "express";
import * as HTTPErrors from "http-errors";
import * as fs from "fs";
import * as path from "path";
import Endpoint from "./endpoint";
import { ServiceCache } from "./cache";
import LoadedHandlers from "./loaded-handlers";
import { Dictionary } from "./types";
import { Comment, getMethodComments } from "./comment-parser";
import toHtml from "./doc-formatter";

export abstract class ExpressApp {

    private settings: Dictionary<string>;
    private applicationRoots: string[];
    public express: express.Application;
    private servicePrototypes = {};
    private injectQueue: any[] = [];
    private endpoints: Endpoint[] = [];
    private apiReference: string;
    private stylesheetPath: string;
    private stylesheet: string;
    private comments = [];

    constructor() {
        this.settings = this.environmentSettings();
        this.express = express();

        this.middleware();
        let commentParsePromise: Promise<Comment[]>;

        if (this.applicationRoots) {
            commentParsePromise = this.loadAll();
            this.loadServices();
            this.loadControllers();
            this.initialise();
        } else {
            throw new Error("applicationRoots must be specified via @Application");
        }
        if (this.apiReference) {
            this.apiReference = this.apiReference.trim();
            if (this.apiReference.startsWith("/")) {
                this.apiReference = this.apiReference.substring(1);
            }
            fs.readFile(this.stylesheetPath || path.join(__dirname, "../assets/docs.css"), "utf-8", (err, data) => {
                this.stylesheet = data;
            });

            this.registerPathsUrl(commentParsePromise);
        }
    }

    protected abstract environmentSettings(): Dictionary<string>;

    protected abstract middleware(): void;

    protected responseFormatter(response: any): any {
        return { data: response };
    }

    protected errorHandler(err, req: express.Request, res: express.Response, next: express.NextFunction) {
        if (!(err instanceof HTTPErrors.HttpError)) {
            console.error(err);
            err = new HTTPErrors.InternalServerError();
        }
        res.statusCode = err.statusCode;
        res.jsonp(err);
    }

    private registerPathsUrl(commentParsePromise: Promise<Comment[]>) {
        commentParsePromise.then(comments => this.comments = comments);
        const router: express.Router = express.Router();
        router.get(new RegExp(`.*\/${this.apiReference}$`), (request, response, next) => {
            if (this.comments) {
                console.log(this.comments.length);
                const paramStart = request.url.indexOf("?");
                const searchUrl = request.url.substring(0, (paramStart === -1 ? request.url.length : paramStart) - this.apiReference.length);
                const matches = this.endpoints.filter(endpoint => endpoint.matchesSearch(searchUrl)).map(endpoint => endpoint.describe(this.comments));
                if (matches.length) {
                    response.send(toHtml(matches, this.stylesheet));
                } else {
                    next();
                }
            } else {
                throw new Error("endpoint descriptions not yet parsed");
            }
        });
        this.express.use("/", router);
    }

    private walkSync(dir) {

        const files = fs.readdirSync(dir);
        let returnList = [];

        files.forEach(file => {
            if (fs.statSync(path.join(dir, file)).isDirectory()) {
                returnList = returnList.concat(this.walkSync(path.join(dir, file)));
            } else {
                returnList.push(path.join(dir, file));
            }
        });
        return returnList;
    }

    private initialise() {
        while (this.injectQueue.length) {
            const service = this.injectQueue.shift();
            this.initialiseInstance(service);
        }
        // Add "not-found" handler for any requests that dont match a route
        this.express.use((req, res, next) => {
            next(new HTTPErrors.NotFound());
        });

        // Pipe errors through to the error handler
        this.express.use((err, req, res, next) => {
            this.errorHandler(err, req, res, next);
        });
    }

    private initialiseInstance(item: any) {
        if (!item.initialised) {
            if (item.autowires) {
                for (const f in item.autowires) {
                    if (item.autowires.hasOwnProperty(f)) {
                        const service = this.getService(item.autowires[f]);
                        if (service) {
                            this.initialiseInstance(service);
                            item[f] = service;
                        }
                    }
                }
            }
            if (typeof item.onInit === "function") {
                item.onInit();
            }
            item.initialised = true;
        }
    }

    private settingsMatch(serviceSettings: Dictionary<string | string[]>, environmentSettings: Dictionary<string>): boolean {
        for (const s in serviceSettings) {
            if (serviceSettings.hasOwnProperty(s)) {
                if (typeof serviceSettings[s] === "string") {
                    if (serviceSettings[s] !== environmentSettings[s]) {
                        return false;
                    }
                } else if (serviceSettings[s].indexOf(environmentSettings[s]) === -1) {
                    return false;
                }
            }
        }
        return true;
    }

    private getService(serviceName) {
        if (ServiceCache.get(serviceName)) {
            return ServiceCache.get(serviceName);
        } else {
            const servicePrototypeList = this.servicePrototypes[serviceName];

            if (!servicePrototypeList || !servicePrototypeList.length) {
                throw Error(`${serviceName} matched no services`);
            }

            const matchingServices = servicePrototypeList.filter(s =>
                this.settingsMatch(s.prototype.service.environmentOptions, this.settings)
            ).sort((s1, s2) => Object.keys(s2.prototype.service.environmentOptions).length - Object.keys(s1.prototype.service.environmentOptions).length);

            if (!matchingServices.length) {
                throw Error(`${serviceName} matched no services with current environment settings`);
            }
            if (matchingServices.length > 1 &&
                Object.keys(matchingServices[0].prototype.service.environmentOptions).length ===
                Object.keys(matchingServices[1].prototype.service.environmentOptions).length) {

                throw Error(`${serviceName} matched multiple services with current environment settings: ${matchingServices.map(s => s.name).join(", ")}`);
            }
            const service = matchingServices[0];
            const instance = new service();
            ServiceCache.put(serviceName, instance);
            // if (service.prototype.autowires) {
            // this.injectQueue.push({ instance: instance, autowireFields: service.prototype.autowires || [] });
            // }
            this.injectQueue.push(instance);
            return instance;
        }
    }

    private loadAll() {

        let readPromise = Promise.resolve([]);

        this.applicationRoots.forEach(root => this.walkSync(root)
            .filter((file) => file.slice(-11) === ".service.js" || file.slice(-14) === ".controller.js")
            .forEach(file => {
                require(file);
                if (file.slice(-14) === ".controller.js") {
                    readPromise = readPromise.then(commentMap => new Promise<any[]>((resolve, reject) => {
                        fs.readFile(file, "utf-8", (err, data) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(commentMap.concat(getMethodComments(data)));
                            }
                        });
                    }));
                }
            }));
        return readPromise;
    }

    private loadServices() {
        LoadedHandlers.services.forEach(service => {
            if (typeof service === "function" && service.prototype.service) {
                this.servicePrototypes[service.prototype.service.name] = this.servicePrototypes[service.prototype.service.name] || [];
                this.servicePrototypes[service.prototype.service.name].push(service);
            }
        });
        Object.keys(this.servicePrototypes).forEach(serviceName => this.getService(serviceName));
    }

    private loadControllers() {
        LoadedHandlers.controllers.forEach(controller => {
            if (typeof controller === "function" && controller.prototype.controller) {
                const controllerData = controller.prototype.controller;
                const router: express.Router = express.Router();

                const instance = new controller();
                if (controllerData.endpoints) {
                    for (const e in controllerData.endpoints) {
                        if (controllerData.endpoints.hasOwnProperty(e)) {

                            const endpoint: Endpoint = new Endpoint(e, controllerData, instance);
                            this.endpoints.push(endpoint);

                            const endPointWrapper = (request, response, next) => endpoint.handle(request, response, next, this.responseFormatter);

                            switch (controllerData.endpoints[e].method) {
                                case "GET": router.get(controllerData.endpoints[e].path, endPointWrapper); break;
                                case "POST": router.post(controllerData.endpoints[e].path, endPointWrapper); break;
                                case "PUT": router.put(controllerData.endpoints[e].path, endPointWrapper); break;
                                case "DELETE": router.delete(controllerData.endpoints[e].path, endPointWrapper); break;
                                case "PATCH": router.patch(controllerData.endpoints[e].path, endPointWrapper); break;
                            }
                        }
                    }
                }
                // if (controller.prototype.autowires) {
                //     this.injectQueue.push({ instance: instance, autowireFields: controller.prototype.autowires });
                // }
                this.injectQueue.push(instance);
                this.express.use(controllerData.path, router);
            }
        });
    }
}
