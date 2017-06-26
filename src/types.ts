import { Request } from "express";

export type Dictionary<T> = { [key: string]: T };

export type ControllerMetaData = {
    path: string,
    endpoints: Dictionary<EndpointMetaData>
};

export type EndpointMetaData = {
    path: string,
    method: string,
    types: string[],
    parameterDecorators: ParameterInfo[],
};

export type ParameterInfo = {
    index: number,
    handler: (request: Request) => any
};

export type Autowirable = {
    instance: any,
    autowireFields: Dictionary<string>
};
