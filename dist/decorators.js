"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function initVal(object, keys) {
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
function Controllers(path) {
    return function (target) {
        target.prototype.controllersPath = path;
    };
}
exports.Controllers = Controllers;
function Services(path) {
    return function (target) {
        target.prototype.servicesPath = path;
    };
}
exports.Services = Services;
function Controller(path) {
    return function (target) {
        initVal(target.prototype, ["controller"]);
        target.prototype.controller.path = path;
    };
}
exports.Controller = Controller;
function setEndpoint(target, propertyKey, path, method) {
    initVal(target, ["controller", "endpoints", propertyKey]);
    target.controller.endpoints[propertyKey].path = path;
    target.controller.endpoints[propertyKey].method = method;
}
function Get(path) {
    return function (target, propertyKey, descriptor) {
        setEndpoint(target, propertyKey, path, "GET");
    };
}
exports.Get = Get;
function Post(path) {
    return function (target, propertyKey, descriptor) {
        setEndpoint(target, propertyKey, path, "POST");
    };
}
exports.Post = Post;
function Put(path) {
    return function (target, propertyKey, descriptor) {
        setEndpoint(target, propertyKey, path, "PUT");
    };
}
exports.Put = Put;
function Delete(path) {
    return function (target, propertyKey, descriptor) {
        setEndpoint(target, propertyKey, path, "DELETE");
    };
}
exports.Delete = Delete;
function Patch(path) {
    return function (target, propertyKey, descriptor) {
        setEndpoint(target, propertyKey, path, "PATCH");
    };
}
exports.Patch = Patch;
function RequestParam(name) {
    return function (target, propertyKey, parameterIndex) {
        initVal(target, ["controller", "endpoints", propertyKey, ["requestParams", []]]);
        target.controller.endpoints[propertyKey].requestParams.push({ index: parameterIndex, name: name });
    };
}
exports.RequestParam = RequestParam;
function QueryParam(name) {
    return function (target, propertyKey, parameterIndex) {
        initVal(target, ["controller", "endpoints", propertyKey, ["queryParams", []]]);
        target.controller.endpoints[propertyKey].queryParams.push({ index: parameterIndex, name: name });
    };
}
exports.QueryParam = QueryParam;
function RequestBody(name) {
    return function (target, propertyKey, parameterIndex) {
        initVal(target, ["controller", "endpoints", propertyKey, ["requestBody", []]]);
        target.controller.endpoints[propertyKey].requestBody.push({ index: parameterIndex, name: name });
    };
}
exports.RequestBody = RequestBody;
function generateServiceName(className) {
    if (!className) {
        throw Error("class name cannot be null or empty");
    }
    return className.charAt(0).toLowerCase() + className.substring(1);
}
function Service(name, environmentOptions = {}) {
    return function (target) {
        target.prototype.service = {
            name: name || generateServiceName(target.name),
            environmentOptions: environmentOptions,
        };
    };
}
exports.Service = Service;
function Autowired(serviceName) {
    return function (target, propertyKey) {
        initVal(target, ["autowires"]);
        target.autowires[propertyKey] = serviceName || propertyKey;
    };
}
exports.Autowired = Autowired;
