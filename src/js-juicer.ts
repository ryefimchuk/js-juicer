import {MinifyOptions} from "uglify-js";

const esprima = require('esprima');
const escope = require('escope');
const UglifyJS = require('uglify-js');

declare interface JsJuicerOptions {

    uglifyJSOptions?: MinifyOptions;
    returnMangledNames?: boolean;
    mangleReadwriteVariables?: boolean;
    excludedNames?: string[];
    minRepeatCount?: number;
    minNameLength?: number;
}

declare interface JsJuicerOutput {

    code?: string;
    mangledGlobalReferenceNames?: string[];
    inputSize?: number;
    outputSize?: number;
    error?: any;
}

function getImplicitlySafeCodeInvocation(globalReferenceNames: string[]): string {
    return '.apply(this,"' + globalReferenceNames.join(',') + '".split(",").map(function(k){return this[k]}))';
}

function getExplicitlySafeCodeInvocation(globalReferenceNames: string[]): string {
    return '(' + globalReferenceNames.map((globalReferenceName: string): string => 'this.' + globalReferenceName).join(',') + ')';
}

function getWrappedCode(code: string, globalReferenceNames: string[]): string {

    const iifeBody: string = '(function(' + globalReferenceNames.join(',') + '){' + code + '})';
    const implicitlySafeCodeInvocation: string = getImplicitlySafeCodeInvocation(globalReferenceNames);
    const explicitlySafeCodeInvocation: string = getExplicitlySafeCodeInvocation(globalReferenceNames);

    if (implicitlySafeCodeInvocation.length < explicitlySafeCodeInvocation.length) {

        return iifeBody + implicitlySafeCodeInvocation;
    }

    return iifeBody + explicitlySafeCodeInvocation;
}

export function squeeze(code: string, options: JsJuicerOptions): JsJuicerOutput {

    if (!options) {

        options = {
            uglifyJSOptions: {},
            returnMangledNames: false,
            mangleReadwriteVariables: false,
            excludedNames: [],
            minRepeatCount: 2,
            minNameLength: 2
        };
    } else {

        if (!options.uglifyJSOptions) {

            options.uglifyJSOptions = {};
        }

        if (!options.excludedNames) {

            options.excludedNames = [];
        }

        if (!options.minRepeatCount || options.minRepeatCount < 0) {

            options.minRepeatCount = 2;
        }

        if (!options.minNameLength || options.minNameLength < 0) {

            options.minNameLength = 2;
        }
    }

    const inputSize = Buffer.byteLength(code, 'utf8');
    const ast = esprima.parseScript(code);
    const scopeManager = escope.analyze(ast);
    const globalScope = scopeManager.globalScope;
    const globalReferenceDictionary: any = {};
    const oftenUsedGlobalReferenceNames: any[] = [];

    globalScope.implicit.left.forEach((reference: any) => {

        const identifier = reference.identifier;
        const name = identifier.name;

        if (!options.mangleReadwriteVariables) {

            if (globalScope.implicit.variables.findIndex((variable: any) => {
                    return variable.name === name
                }) !== -1) {

                return;
            }
        }

        if (name.length >= options.minNameLength) {

            if (globalReferenceDictionary[name]) {

                globalReferenceDictionary[name].push(reference);
            } else {

                globalReferenceDictionary[name] = [reference];
            }
        }
    });

    Object
        .keys(globalReferenceDictionary)
        .forEach((referenceName: string): void => {

            const references = globalReferenceDictionary[referenceName];

            if (references.length >= options.minRepeatCount && options.excludedNames.indexOf(referenceName) === -1) {

                oftenUsedGlobalReferenceNames.push(referenceName);
            }
        });

    const wrappedCode: string = getWrappedCode(code, oftenUsedGlobalReferenceNames);
    const output = UglifyJS.minify(wrappedCode, options.uglifyJSOptions);

    if (output.error) {

        return {
            error: output.error
        };
    }

    if (options.returnMangledNames) {

        return {
            code: output.code,
            inputSize: inputSize,
            outputSize: Buffer.byteLength(output.code, 'utf8'),
            mangledGlobalReferenceNames: oftenUsedGlobalReferenceNames
        };
    }

    return {
        code: output.code,
        inputSize: inputSize,
        outputSize: Buffer.byteLength(output.code, 'utf8')
    };
}