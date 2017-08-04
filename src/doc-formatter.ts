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

    let output = `<div class="parameter-group ${generateClassName(groupName)}"><h3>${groupName}${parameters.length === 1 ? "" : "s"}</h3>
    <table class="parameter-table">`;
    const hasNames = !!parameters.find(p => !!p.name);
    const hasTypes = !!parameters.find(p => !!p.valueType);
    const hasDescriptions = !!parameters.find(p => !!p.description);

    output += `<thead><tr>${hasNames ? "<th>Name</th>" : ""}${hasTypes ? "<th>Type</th>" : ""}${hasDescriptions ? "<th>Description</th>" : ""}</tr></thead><tbody>`;

    for (const param of parameters) {
        output += "<tr>";
        if (hasNames) {
            output += `<td><span class="parameter-name">${param.name || ""}</span></td>`;
        }
        if (hasTypes) {
            output += `<td><span class="parameter-type ${param.valueType ? "parameter-type-" + generateClassName(param.valueType) : ""}">${param.valueType || ""}</span></td>`;
        }
        if (hasDescriptions) {
            output += `<td><span class="parameter-description">${param.description || ""}</span></td>`;
        }
        output += "</tr>";
    }
    return output + "</tbody></table></div>";
}

function generateClassName(groupName: string) {
    return groupName.replace(/(.)([A-Z])/g, "$1-$2").toLowerCase();
}
