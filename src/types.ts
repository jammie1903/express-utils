export type Dictionary<T> = { [key: string]: T };

export type ControllerMetaData = {
    path: string,
    endpoints: Dictionary<EndpointMetaData>
};

export type EndpointMetaData = {
    path: string,
    method: string,
    requestParams: ParameterInfo[],
    queryParams: ParameterInfo[],
    requestBody: any
};

export type ParameterInfo = {
    index: number,
    name: string
};

export type Autowirable = {
    instance: any,
    autowireFields: Dictionary<string>
};
