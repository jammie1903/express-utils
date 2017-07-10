import { EndpointDescription, ParameterDescription, Dictionary } from "./types";

export default function (endpoints: any[]): string {
    let returnHTML = "<html><body>";
    for (const endpoint of endpoints) {
        returnHTML += `<h1>${endpoint.name}</h1>
        <div>Path: ${endpoint.path}</div>
        <p>${endpoint.description.replace(/\n/g, "<br />")}</p>
        ${getParameterGroupsHTML(groupParameters(endpoint.parameters))}`;
    }

    return returnHTML + "</body></html>";
}

function groupParameters(parameters: ParameterDescription[]): Dictionary<ParameterDescription[]> {
    return parameters.reduce((res, param) => {
        if (!res[param.type]) {
            res[param.type] = [];
        }
        res[param.type].push(param);
        return res;
    }, {});
}

function getParameterGroupsHTML(parameterGroups: Dictionary<ParameterDescription[]>) {

    let output = "";

    for (const group in parameterGroups) {
        if (parameterGroups.hasOwnProperty(group)) {
            output += getParameterGroupHTML(group, parameterGroups[group]);
        }
    }
    return output;
}

function getParameterGroupHTML(groupName: string, parameters: ParameterDescription[]) {

    let output = "<h3>" + groupName + (parameters.length === 1 ? "" : "s") + "</h3><ul>";

    for (const param of parameters) {
        output += `<li>${param.name ? param.name + ": " : ""}${param.valueType}${param.description ? ": " + param.description : ""}</li>`;
    }
    return output + "</ul>";
}
