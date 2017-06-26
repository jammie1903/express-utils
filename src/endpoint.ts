import { ControllerMetaData, EndpointMetaData } from "./types";
import { Request, Response } from "express";
import "reflect-metadata";

export default class Endpoint {
    private injectResponse: boolean;
    private injectRequest: boolean;
    private endpointMetaData: EndpointMetaData;
    private method: any;

    constructor(private methodName: string, private controllerData: ControllerMetaData, private controller: any) {
        this.method = controller[methodName];

        this.endpointMetaData = controllerData.endpoints[methodName];

        let injectionIndexes = [];
        if (this.endpointMetaData.parameterDecorators) {
            injectionIndexes = injectionIndexes.concat(this.endpointMetaData.parameterDecorators.map(p => p.index));
        }

        this.injectRequest = this.endpointMetaData.types.length > 0 && injectionIndexes.indexOf(0) === -1;
        this.injectResponse = this.endpointMetaData.types.length > 1 && this.injectRequest && injectionIndexes.indexOf(1) === -1;
    }

    public handle(request: Request, response: Response, next) {

        const parameters: any[] = Array(this.endpointMetaData.types.length).fill(null);

        if (this.injectRequest) {
            parameters[0] = request;
        }
        if (this.injectResponse) {
            parameters[1] = response;
        }

        if (this.endpointMetaData.parameterDecorators) {
            this.endpointMetaData.parameterDecorators.forEach(param => {
                parameters[param.index] = this.getValue(param.handler(request), this.endpointMetaData.types[param.index]);
            });
        }

        const responseBody = this.method.apply(this.controller, parameters) || "";
        Promise.resolve(responseBody).then(result => response.finished ? null : response.jsonp(result)).catch(next);
    }

    private getValue(value: string, type: string): any {
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
}
