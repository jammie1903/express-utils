"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
class Endpoint {
    constructor(methodName, controllerData, controller) {
        this.methodName = methodName;
        this.controllerData = controllerData;
        this.controller = controller;
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
    handle(request, response) {
        const parameters = Array(this.types.length).fill(null);
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
        const responseBody = this.method.apply(this.controller, parameters);
        if (typeof responseBody !== "undefined") {
            response.jsonp(responseBody);
        }
    }
    getValue(value, type) {
        switch (type) {
            case "Boolean":
                const lowercaseValue = value ? value.toLowerCase() : null;
                return lowercaseValue && (lowercaseValue === "true" || lowercaseValue === "y" || lowercaseValue === "1");
            case "Number":
                const numberValue = Number(value);
                return isNaN(numberValue) ? null : numberValue;
            case "String":
                return typeof value !== "undefined" && value !== null ? String(value) : null;
            default: return value;
        }
    }
}
exports.default = Endpoint;
