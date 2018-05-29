'use strict';

const escope = require('escope');
const esprima = require('esprima');
const UglifyJS = require('uglify-js');

const getImplicitlySafeCodeInvocation = (globalReferenceNames) => `.apply(this,"${globalReferenceNames.join(',')}".split(",").map(function(k){return this[k]}))`;
const getExplicitlySafeCodeInvocation = (globalReferenceNames) => `(${globalReferenceNames.map((globalReferenceName) => `this.${globalReferenceName}`).join(',')})`;

function getWrappedCode(code, globalReferenceDictionary, excludedGlobalReferenceNames) {

    let oftenUsedGlobalReferenceNames = [];

    Object
        .keys(globalReferenceDictionary)
        .forEach((referenceName) => {

            const references = globalReferenceDictionary[referenceName];

            if (references.length > 1 && excludedGlobalReferenceNames.indexOf(referenceName) === -1) {

                oftenUsedGlobalReferenceNames.push(referenceName);
            }
        });

    oftenUsedGlobalReferenceNames = oftenUsedGlobalReferenceNames.sort();

    const wrappedCode = `(function(${oftenUsedGlobalReferenceNames.join(',')}){${code}})`;
    const implicitlySafeCodeInvocation = getImplicitlySafeCodeInvocation(oftenUsedGlobalReferenceNames);
    const explicitlySafeCodeInvocation = getExplicitlySafeCodeInvocation(oftenUsedGlobalReferenceNames);

    if (implicitlySafeCodeInvocation.length < explicitlySafeCodeInvocation.length) {

        return wrappedCode + implicitlySafeCodeInvocation;
    }

    return wrappedCode + explicitlySafeCodeInvocation;
}

function squeeze(code, options = {}) {

    if (!options.excludedGlobalReferenceNames) {

        options.excludedGlobalReferenceNames = [];
    }

    if (!options.uglifyJSOptions) {

        options.uglifyJSOptions = {};
    }


    const inputSize = Buffer.byteLength(code, 'utf8');
    const ast = esprima.parse(code);
    const scopeManager = escope.analyze(ast);
    const globalScope = scopeManager.globalScope;
    const globalReferenceDictionary = {};

    globalScope.implicit.left.forEach((reference) => {

        const identifier = reference.identifier;

        if (globalScope.implicit.variables.findIndex((variable) => variable.name === identifier.name) !== -1) {

            return;
        }

        if (globalReferenceDictionary[identifier.name]) {

            globalReferenceDictionary[identifier.name].push(reference);
        } else {

            globalReferenceDictionary[identifier.name] = [reference];
        }
    });

    const wrappedCode = getWrappedCode(code, globalReferenceDictionary, options.excludedGlobalReferenceNames);
    const output = UglifyJS.minify(wrappedCode, options.uglifyJSOptions);

    if (output.error) {

        return {
            error: output.error
        };
    }

    return {
        code: output.code,
        inputSize: inputSize,
        outputSize: Buffer.byteLength(output.code, 'utf8')
    };
}

exports.squeeze = squeeze;