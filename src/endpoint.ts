import { ControllerMetaData, EndpointMetaData } from "./types";
import { Request, Response } from "express";
import "reflect-metadata";

export default class Endpoint {
    private injectResponse: boolean;
    private injectRequest: boolean;
    private types: string[];
    private endpointMetaData: EndpointMetaData;
    private method: any;

    constructor(private methodName: string, private controllerData: ControllerMetaData, private controller: any) {
        this.method = controller[methodName];

        this.types = Reflect.getMetadata("design:paramtypes", controller, methodName).map(a => a.name);

        this.endpointMetaData = controllerData.endpoints[methodName];

        let injectionIndexes = [];
        if (this.endpointMetaData.queryParams) {
            injectionIndexes = injectionIndexes.concat(this.endpointMetaData.queryParams.map(p => p.index));
        }
        if (this.endpointMetaData.requestParams) {
            injectionIndexes = injectionIndexes.concat(this.endpointMetaData.requestParams.map(p => p.index));
        }
        if (this.endpointMetaData.requestBody) {
            injectionIndexes = injectionIndexes.concat(this.endpointMetaData.requestBody.map(p => p.index));
        }
        this.injectRequest = this.types.length > 0 && injectionIndexes.indexOf(0) === -1;
        this.injectResponse = this.types.length > 1 && this.injectRequest && injectionIndexes.indexOf(1) === -1;
    }

    public handle(request: Request, response: Response, next) {

        const parameters: any[] = Array(this.types.length).fill(null);

        if (this.injectRequest) {
            parameters[0] = request;
        }
        if (this.injectResponse) {
            parameters[1] = response;
        }

        if (this.endpointMetaData.queryParams) {
            this.endpointMetaData.queryParams.forEach(param => {
                parameters[param.index] = this.getValue(request.query[param.name], this.types[param.index]);
            });
        }
        if (this.endpointMetaData.requestParams) {
            this.endpointMetaData.requestParams.forEach(param => {
                parameters[param.index] = this.getValue(request.params[param.name], this.types[param.index]);
            });
        }
        if (this.endpointMetaData.requestBody) {
            this.endpointMetaData.requestBody.forEach(param => {
                parameters[param.index] = this.getValue(param.name ? request.body[param.name] : request.body, this.types[param.index]);
            });
        }

        const responseBody = this.method.apply(this.controller, parameters) || "";
        Promise.resolve(responseBody).then(result => response.jsonp(result)).catch(next);
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
