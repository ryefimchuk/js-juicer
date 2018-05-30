'use strict';

function jsJuicerFactory(escope, esprima, UglifyJS) {

    function getImplicitlySafeCodeInvocation(globalReferenceNames) {
        return '.apply(this,"' + globalReferenceNames.join(',') + '".split(",").map(function(k){return this[k]}))';
    }

    function getExplicitlySafeCodeInvocation(globalReferenceNames) {
        return '(' + globalReferenceNames.map(function (globalReferenceName) {
            return 'this.' + globalReferenceName
        }).join(',') + ')';
    }

    function getWrappedCode(code, globalReferenceNames) {

        var iifeBody = '(function(' + globalReferenceNames.join(',') + '){' + code + '})';
        var implicitlySafeCodeInvocation = getImplicitlySafeCodeInvocation(globalReferenceNames);
        var explicitlySafeCodeInvocation = getExplicitlySafeCodeInvocation(globalReferenceNames);

        if (implicitlySafeCodeInvocation.length < explicitlySafeCodeInvocation.length) {

            return iifeBody + implicitlySafeCodeInvocation;
        }

        return iifeBody + explicitlySafeCodeInvocation;
    }

    function squeeze(code, options) {

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

        var inputSize = Buffer.byteLength(code, 'utf8');
        var ast = esprima.parse(code);
        var scopeManager = escope.analyze(ast);
        var globalScope = scopeManager.globalScope;
        var globalReferenceDictionary = {};
        var oftenUsedGlobalReferenceNames = [];

        globalScope.implicit.left.forEach(function (reference) {

            var identifier = reference.identifier;
            var name = identifier.name;

            if (!options.mangleReadwriteVariables) {

                if (globalScope.implicit.variables.findIndex(function (variable) {
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
            .forEach(function (referenceName) {

                var references = globalReferenceDictionary[referenceName];

                if (references.length >= options.minRepeatCount && options.excludedNames.indexOf(referenceName) === -1) {

                    oftenUsedGlobalReferenceNames.push(referenceName);
                }
            });

        var wrappedCode = getWrappedCode(code, oftenUsedGlobalReferenceNames);
        var output = UglifyJS.minify(wrappedCode, options.uglifyJSOptions);

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

    return {
        squeeze: squeeze
    };
}

module.exports = jsJuicerFactory(
    require('escope'),
    require('esprima'),
    require('uglify-js')
);