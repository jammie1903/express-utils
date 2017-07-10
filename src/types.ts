import { Request } from "express";

export type Dictionary<T> = { [key: string]: T };

export interface IEndpointParameterDecorator {
    handle(request: Request): any;
    describe(parameterType: string): ParameterDescription;
}

export type ParameterDescription = {
    type: string,
    name?: string,
    valueType: string
    description?: string
};

export type EndpointDescription = {
    name: string,
    path: string,
    description: string,
    parameters: ParameterDescription[]
};

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
    handler: IEndpointParameterDecorator
};

export type Autowirable = {
    instance: any,
    autowireFields: Dictionary<string>
};
