"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const HTTPError = require("http-errors");
const fs = require("fs");
const path = require("path");
const endpoint_1 = require("./endpoint");
class ExpressApp {
    constructor() {
        this.servicePrototypes = {};
        this.services = {};
        this.injectQueue = [];
        this.settings = this.environmentSettings();
        this.express = express();
        this.middleware();
        if (this.servicesPath) {
            this.loadServices();
        }
        if (this.controllersPath) {
            this.loadControllers();
        }
        if (this.servicesPath) {
            this.injectServices();
        }
    }
    walkSync(dir) {
        const files = fs.readdirSync(dir);
        let returnList = [];
        files.forEach(file => {
            if (fs.statSync(path.join(dir, file)).isDirectory()) {
                returnList = returnList.concat(this.walkSync(path.join(dir, file)));
            }
            else {
                returnList.push(path.join(dir, file));
            }
        });
        return returnList;
    }
    injectServices() {
        while (this.injectQueue.length) {
            const item = this.injectQueue.shift();
            for (const f in item.autowireFields) {
                if (item.autowireFields.hasOwnProperty(f)) {
                    const service = this.getService(item.autowireFields[f]);
                    if (service) {
                        item.instance[f] = service;
                    }
                }
            }
        }
    }
    settingsMatch(serviceSettings, environmentSettings) {
        for (const s in serviceSettings) {
            if (serviceSettings.hasOwnProperty(s)) {
                if (typeof serviceSettings[s] === "string") {
                    if (serviceSettings[s] !== environmentSettings[s]) {
                        return false;
                    }
                }
                else if (serviceSettings[s].indexOf(environmentSettings[s]) === -1) {
                    return false;
                }
            }
        }
        return true;
    }
    getService(serviceName) {
        if (this.services[serviceName]) {
            return this.services[serviceName];
        }
        else {
            const servicePrototypeList = this.servicePrototypes[serviceName];
            if (!servicePrototypeList || !servicePrototypeList.length) {
                throw Error(`${serviceName} matched no services`);
            }
            const matchingServices = servicePrototypeList.filter(service => this.settingsMatch(service.prototype.service.environmentOptions, this.settings)).sort((s1, s2) => Object.keys(s2.prototype.service.environmentOptions).length - Object.keys(s1.prototype.service.environmentOptions).length);
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
            this.services[serviceName] = instance;
            if (service.prototype.autowires) {
                this.injectQueue.push({ instance: instance, autowireFields: service.prototype.autowires });
            }
            return instance;
        }
    }
    loadServices() {
        this.walkSync(this.servicesPath).filter((file) => file.slice(-11) === ".service.js")
            .forEach((file) => {
            const service = require(file).default;
            if (typeof service === "function" && service.prototype.service) {
                this.servicePrototypes[service.prototype.service.name] = this.servicePrototypes[service.prototype.service.name] || [];
                this.servicePrototypes[service.prototype.service.name].push(service);
            }
        });
    }
    loadControllers() {
        this.walkSync(this.controllersPath).filter((file) => file.slice(-14) === ".controller.js")
            .forEach((file) => {
            const controller = require(file).default;
            if (typeof controller === "function" && controller.prototype.controller) {
                const controllerData = controller.prototype.controller;
                const router = express.Router();
                const instance = new controller();
                if (controllerData.endpoints) {
                    for (const e in controllerData.endpoints) {
                        if (controllerData.endpoints.hasOwnProperty(e)) {
                            const endpoint = new endpoint_1.default(e, controllerData, instance);
                            const endPointWrapper = (request, response) => endpoint.handle(request, response);
                            switch (controllerData.endpoints[e].method) {
                                case "GET":
                                    router.get(controllerData.endpoints[e].path, endPointWrapper);
                                    break;
                                case "POST":
                                    router.post(controllerData.endpoints[e].path, endPointWrapper);
                                    break;
                                case "PUT":
                                    router.put(controllerData.endpoints[e].path, endPointWrapper);
                                    break;
                                case "DELETE":
                                    router.delete(controllerData.endpoints[e].path, endPointWrapper);
                                    break;
                                case "PATCH":
                                    router.patch(controllerData.endpoints[e].path, endPointWrapper);
                                    break;
                            }
                        }
                    }
                }
                if (controller.prototype.autowires) {
                    this.injectQueue.push({ instance: instance, autowireFields: controller.prototype.autowires });
                }
                this.express.use(controllerData.path, router);
            }
        });
    }
    // Configure API endpoints.
    routes() {
        // 404
        this.express.use((req, res, next) => {
            res.jsonp(new HTTPError.NotFound());
        });
        // 500
        this.express.use((err, req, res, next) => {
            if (err instanceof HTTPError.HttpError) {
                res.statusCode = err.statusCode;
                res.jsonp(err);
            }
            else {
                res.jsonp(new HTTPError.InternalServerError());
            }
        });
    }
}
exports.ExpressApp = ExpressApp;
