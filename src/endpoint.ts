import { ControllerMetaData, EndpointMetaData, ParameterDescription, EndpointDescription } from "./types";
import { Request, Response } from "express";
import { Comment } from "./comment-parser";
import "reflect-metadata";

export default class Endpoint {
    private injectResponse: boolean;
    private injectRequest: boolean;
    private endpointMetaData: EndpointMetaData;
    private method: any;
    private fullPath: string;

    constructor(private methodName: string, controllerData: ControllerMetaData, private controller: any) {
        this.method = controller[methodName];
        this.endpointMetaData = controllerData.endpoints[methodName];
        this.fullPath = this.trimSlashes(this.trimSlashes(controllerData.path) + "/" + this.trimSlashes(this.endpointMetaData.path));

        let injectionIndexes = [];
        if (this.endpointMetaData.parameterDecorators) {
            injectionIndexes = injectionIndexes.concat(this.endpointMetaData.parameterDecorators.map(p => p.index));
        }

        this.injectRequest = this.endpointMetaData.types.length > 0 && injectionIndexes.indexOf(0) === -1;
        this.injectResponse = this.endpointMetaData.types.length > 1 && this.injectRequest && injectionIndexes.indexOf(1) === -1;
    }

    public handle(request: Request, response: Response, next, responseFormatter: (response: any) => any) {

        const parameters: any[] = Array(this.endpointMetaData.types.length).fill(null);

        if (this.injectRequest) {
            parameters[0] = request;
        }
        if (this.injectResponse) {
            parameters[1] = response;
        }

        let handlerPromise = Promise.resolve();

        if (this.endpointMetaData.parameterDecorators) {
            this.endpointMetaData.parameterDecorators.forEach(param => {
                handlerPromise = handlerPromise.then(() => {
                    return Promise.resolve(param.handler.handle(request)).then(paramValue => {
                        parameters[param.index] = this.getValue(paramValue, this.endpointMetaData.types[param.index]);
                    });
                });
            });
        }
        handlerPromise.then(() => {
            Promise.resolve(this.method.apply(this.controller, parameters) || "").then(result => response.finished ? null : response.json(responseFormatter(result))).catch(next);
        });
        // const responseBody = this.method.apply(this.controller, parameters) || "";
        // Promise.resolve(responseBody).then(result => response.finished ? null : response.jsonp(result)).catch(next);
    }

    private getValue(value: any, type: any): any {
        if (typeof value === "undefined" || typeof value === "string") {
            switch (type) {
                case "Boolean":
                    const lowercaseValue = value ? value.toLowerCase() : null;
                    return lowercaseValue && (lowercaseValue === "true" || lowercaseValue === "y" || lowercaseValue === "1");
                case "Number":
                    const numberValue: number = Number(value);
                    return isNaN(numberValue) ? null : numberValue;
                case "String":
                    return typeof value !== "undefined" && value !== null ? String(value) : null;
                default: return value;
            }
        }
        return value;
    }

    private trimSlashes(val: string): string {
        if (!val || !val.trim().length) {
            return "";
        }
        let returnValue = val.trim();
        if (returnValue.startsWith("/")) {
            returnValue = returnValue.substring(1);
        }
        if (returnValue.endsWith("/")) {
            returnValue = returnValue.substring(0, returnValue.length - 1);
        }
        return returnValue;
    }

    public matchesSearch(url: string) {
        const searchUrl = this.trimSlashes(url);
        if (!searchUrl.length) {
            return true;
        }
        const expectedUrlSegments: string[] = searchUrl.split("/").map(segment => segment.startsWith(":") ? segment.substring(1) : segment);
        const actualUrlSegments = this.fullPath.split("/").map(segment => segment.startsWith(":") ? segment.substring(1) : segment);
        if (actualUrlSegments.length < expectedUrlSegments.length) {
            return false;
        }
        for (let i = 0; i < expectedUrlSegments.length; i++) {
            if (expectedUrlSegments[i] !== actualUrlSegments[i]) {
                return false;
            }
        }

        return true;
    }

    private getParamCommentString(paramDescription: ParameterDescription): string {
        return "@" + paramDescription.type + " " + (paramDescription.name ? paramDescription.name + " " : "");
    }

    public describe(commentList: Comment[]): EndpointDescription {

        let parameters: ParameterDescription[] = [];
        if (this.endpointMetaData.parameterDecorators) {
            this.endpointMetaData.parameterDecorators.forEach(param => {
                const paramDescription = param.handler.describe(this.endpointMetaData.types[param.index]);
                if (paramDescription) {
                    parameters.push(paramDescription);
                }
            });
        }
        parameters = parameters.filter((item, index, self) => self.findIndex(t => this.getParamCommentString(t) === this.getParamCommentString(item)) === index);

        const comment = commentList.filter(c => c.class === this.controller.constructor.name && c.method === this.methodName)[0];
        let description = "";
        if (comment) {
            const commentLines = comment.value.split("\n");

            for (const param of parameters) {
                let index = 0;
                const paramText = this.getParamCommentString(param);
                for (const line of commentLines) {
                    if (line.startsWith(paramText)) {
                        param.description = line.substr(paramText.length).trim();
                        break;
                    }
                    index++;
                }
                if (index < commentLines.length) {
                    commentLines.splice(index, 1);
                }
            }
            description = commentLines.join("\n");
        }

        const displayName = this.methodName.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase());

        return { name: displayName, method: this.endpointMetaData.method, path: this.fullPath || "/", description: description, parameters: parameters };
    }
}
