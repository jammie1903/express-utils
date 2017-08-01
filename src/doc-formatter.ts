import { EndpointDescription, ParameterDescription, Dictionary } from "./types";

export default function (endpoints: EndpointDescription[], style: string): string {
    let returnHTML = "<html><head><style>" + (style || "") + "</style></head><body>";
    for (const endpoint of endpoints) {
        returnHTML += `<div class="endpoint">
        <h1 class="title">${endpoint.name}</h1>
        <div class="info method"><label>Method:</label><span class="value ${endpoint.method.toLowerCase()}">${endpoint.method}</span></div>
        <div class="info path"><label>Path:</label><span class="value">${parsePath(endpoint.path)}</span></div>
        <p class="description">${endpoint.description.replace(/\n/g, "<br />")}</p>
        ${getParameterGroupsHTML(groupParameters(endpoint.parameters))}
        </div>`;
    }

    return returnHTML + "</body></html>";
}

function parsePath(path: string) {
    return path.replace(/(:\w+)/g, "<span class='request-parameter'>$1</span>");
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

    let output = `<div class="parameter-group ${generateClassName(groupName)}"><h3>` + groupName + (parameters.length === 1 ? "" : "s") + "</h3><ul>";

    for (const param of parameters) {
        output += `<li>${param.name ? param.name + ": " : ""}${param.valueType}${param.description ? ": " + param.description : ""}</li>`;
    }
    return output + "</ul></div>";
}

function generateClassName(groupName: string) {
     return groupName.replace(/(.)([A-Z])/g, "$1-$2").toLowerCase();
}
