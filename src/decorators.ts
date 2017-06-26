import { Router, Request, Response, NextFunction } from "express";
import { Dictionary } from "./types";
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

export function Controllers(path: string) {
    return function (target: any) {
        target.prototype.controllersPath = path;
    };
}

export function Services(path: string) {
    return function (target: any) {
        target.prototype.servicesPath = path;
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

export function RequestParam(name: string) {
    return function (target: any, propertyKey: string, parameterIndex: number) {
        EndpointParameterDecorator(target, propertyKey, parameterIndex, request => request.params[name]);
    };
}

export function QueryParam(name: string) {
    return function (target: any, propertyKey: string, parameterIndex: number) {
        EndpointParameterDecorator(target, propertyKey, parameterIndex, request => request.query[name]);
    };
}

export function RequestBody(name?: string) {
    return function (target: any, propertyKey: string, parameterIndex: number) {
        EndpointParameterDecorator(target, propertyKey, parameterIndex, request => name ? request.body[name] : request.body);
    };
}

export function EndpointParameterDecorator(target: any, propertyKey: string, parameterIndex: number, handler: (request: Request) => string) {
    initVal(target, ["controller", "endpoints", propertyKey, ["parameterDecorators", []]]);
    target.controller.endpoints[propertyKey].parameterDecorators.push({ index: parameterIndex, handler });
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
