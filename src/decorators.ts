import { Router, Request, Response, NextFunction } from "express";
import { Dictionary, IEndpointParameterDecorator, ParameterDescription } from "./types";
import LoadedHandlers from "./loaded-handlers";

function initVal(object: any, keys: Array<string | any[]>) {
    let obj = object;
    keys.forEach(k => {
        let key = k;
        if (typeof key === "string") {
            key = [key, {}];
        }
        obj[key[0]] = obj[key[0]] || key[1];
        obj = obj[key[0]];
    });
}

export function Application(...paths: string[]) {
    return function (target: any) {
        target.prototype.applicationRoots = paths;
    };
}

export function ApiReference(path: string) {
    return function (target: any) {
        target.prototype.apiReference = path;
    };
}

export function Controller(path: string) {
    return function (target: any) {
        initVal(target.prototype, ["controller"]);
        target.prototype.controller.path = path;
        LoadedHandlers.controllers.push(target);
    };
}

function setEndpoint(target: any, propertyKey: string, path: string, method: string) {
    initVal(target, ["controller", "endpoints", propertyKey]);
    target.controller.endpoints[propertyKey].path = path;
    target.controller.endpoints[propertyKey].method = method;
    target.controller.endpoints[propertyKey].types = Reflect.getMetadata("design:paramtypes", target, propertyKey).map(a => a.name);
}

export function Get(path: string) {
    return function (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
        setEndpoint(target, propertyKey, path, "GET");
    };
}

export function Post(path: string) {
    return function (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
        setEndpoint(target, propertyKey, path, "POST");
    };
}

export function Put(path: string) {
    return function (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
        setEndpoint(target, propertyKey, path, "PUT");
    };
}

export function Delete(path: string) {
    return function (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
        setEndpoint(target, propertyKey, path, "DELETE");
    };
}

export function Patch(path: string) {
    return function (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) {
        setEndpoint(target, propertyKey, path, "PATCH");
    };
}

class RequestParamDecorator implements IEndpointParameterDecorator {
    constructor(private name: string) { }

    handle(request: Request) {
        return request.params[this.name];
    }
    describe(parameterType: string): ParameterDescription {
        return { type: "RequestParam", name: this.name, valueType: parameterType };
    }
}

export function RequestParam(name: string) {
    return function (target: any, propertyKey: string, parameterIndex: number) {
        registerEndpointParameterDecorator(target, propertyKey, parameterIndex, new RequestParamDecorator(name));
    };
}

class QueryParamDecorator implements IEndpointParameterDecorator {
    constructor(private name: string) { }

    handle(request: Request) {
        return request.query[this.name];
    }
    describe(parameterType: string): ParameterDescription {
        return { type: "QueryParam", name: this.name, valueType: parameterType };
    }
}

export function QueryParam(name: string) {
    return function (target: any, propertyKey: string, parameterIndex: number) {
        registerEndpointParameterDecorator(target, propertyKey, parameterIndex, new QueryParamDecorator(name));
    };
}

class RequestBodyDecorator implements IEndpointParameterDecorator {
    constructor(private name: string) { }

    handle(request: Request) {
        return this.name ? request.body[this.name] : request.body;
    }

    describe(parameterType: string): ParameterDescription {
        return { type: "RequestBody", valueType: (this.name ? "Object" : parameterType) };
    }
}

export function RequestBody(name?: string) {
    return function (target: any, propertyKey: string, parameterIndex: number) {
        registerEndpointParameterDecorator(target, propertyKey, parameterIndex, new RequestBodyDecorator(name));
    };
}

class GenericEndpointParameterDecorator implements IEndpointParameterDecorator {

    constructor(private handler: (request: Request) => any) { }

    handle(request: Request) {
        this.handler(request);
    }
    describe(parameterType: string): ParameterDescription {
        return null;
    }
}

export function registerEndpointParameterDecorator(target: any, propertyKey: string, parameterIndex: number, handler: ((request: Request) => any) | IEndpointParameterDecorator) {
    initVal(target, ["controller", "endpoints", propertyKey, ["parameterDecorators", []]]);

    if (typeof handler === "function") {
        target.controller.endpoints[propertyKey].parameterDecorators.push({ index: parameterIndex, handler: new GenericEndpointParameterDecorator(handler) });
    } else {
        target.controller.endpoints[propertyKey].parameterDecorators.push({ index: parameterIndex, handler });
    }
}

function generateServiceName(className: string) {
    if (!className) {
        throw Error("class name cannot be null or empty");
    }
    return className.charAt(0).toLowerCase() + className.substring(1);
}

export function Service(name?: string, environmentOptions: Dictionary<string | string[]> = {}) {
    return function (target: any) {
        target.prototype.service = {
            name: name || generateServiceName(target.name),
            environmentOptions: environmentOptions,
        };
        LoadedHandlers.services.push(target);
    };
}

export function Autowired(serviceName?: string) {
    return function (target: any, propertyKey: string) {
        initVal(target, ["autowires"]);
        target.autowires[propertyKey] = serviceName || propertyKey;
    };
}
