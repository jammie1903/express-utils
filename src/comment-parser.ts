import * as esprima from "esprima";

function parseComment(rawComment: string) {
    return rawComment.split("\n").map(line => line.replace(/^\s*\*/, "").trim()).filter(line => line.length).join("\n");
}

export type Comment = {
    class: string
    method: string
    value: string
};

export function getMethodComments(fileContents: string): Comment[] {

    const tokens = esprima.tokenize(fileContents, { comment: true });

    let lastClass = "";
    const returnList = [];

    for (let i = 1; i < tokens.length; i++) {

        if (tokens[i - 1].type === "Keyword" && tokens[i - 1].value === "class") {
            lastClass = tokens[i].value;
        } else if (tokens[i - 1].type === "BlockComment" && tokens[i].type === "Identifier") {
            returnList.push({ class: lastClass, method: tokens[i].value, value: parseComment(tokens[i - 1].value) });
        }
    }

    return returnList;
}
