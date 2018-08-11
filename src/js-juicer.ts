import * as UglifyJS from 'uglify-js';
import {MinifyOptions} from 'uglify-js';
import * as esprima from 'esprima';

const escope = require('escope');

export interface JsJuicerOptions {

  minifyOptions?: MinifyOptions;
  returnMangledNames?: boolean;
  mangleReadwriteVariables?: boolean;
  excludedNames?: string[];
  minRepeatCount?: number;
  minNameLength?: number;
}

export interface JsJuicerOutput {

  code?: string;
  mangledGlobalReferenceNames?: string[];
  inputLength?: number;
  outputLength?: number;
  error?: any;
}

function getImplicitlySafeCodeInvocation(globalReferenceNames: string[]): string {
  return `.apply(this,"${globalReferenceNames.join(',')}".split(",").map(function(k){return this[k]}))`;
}

function getExplicitlySafeCodeInvocation(globalReferenceNames: string[]): string {
  return `(${globalReferenceNames.map((globalReferenceName: string): string => `this.${globalReferenceName}`).join(',')})`;
}

function getWrappedCode(code: string, globalReferenceNames: string[]): string {

  const iifeBody: string = `(function(${globalReferenceNames.join(',')}){${code}})`;
  const implicitlySafeCodeInvocation: string = getImplicitlySafeCodeInvocation(globalReferenceNames);
  const explicitlySafeCodeInvocation: string = getExplicitlySafeCodeInvocation(globalReferenceNames);

  if (implicitlySafeCodeInvocation.length < explicitlySafeCodeInvocation.length) {

    /* istanbul ignore next */
    return iifeBody + implicitlySafeCodeInvocation;
  }

  return iifeBody + explicitlySafeCodeInvocation;
}

export function squeeze(code: string, {
  minifyOptions = {},
  returnMangledNames = false,
  mangleReadwriteVariables = false,
  excludedNames = [],
  minRepeatCount = 2,
  minNameLength = 2
}: JsJuicerOptions = {}): JsJuicerOutput {

  try {

    const inputLength: number = code.length;
    const ast: esprima.Program = esprima.parseScript(code);
    const scopeManager: any = escope.analyze(ast);
    const globalScope: any = scopeManager.globalScope;
    const globalReferenceDictionary: { [key: string]: any } = {};
    const oftenUsedGlobalReferenceNames: any[] = [];

    globalScope.implicit.left.forEach((reference: any): void => {

      const identifier = reference.identifier;
      const name = identifier.name;

      if (!mangleReadwriteVariables) {

        if (globalScope.implicit.variables.findIndex((variable: any) => {
          return variable.name === name;
        }) !== -1) {

          return;
        }
      }

      if (name.length >= minNameLength) {

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

        if (references.length >= minRepeatCount && excludedNames.indexOf(referenceName) === -1) {

          oftenUsedGlobalReferenceNames.push(referenceName);
        }
      });

    const wrappedCode: string = getWrappedCode(code, oftenUsedGlobalReferenceNames);
    const output: UglifyJS.MinifyOutput = UglifyJS.minify(wrappedCode, minifyOptions);

    if (output.error) {

      /* istanbul ignore next */
      return {
        error: output.error
      };
    }

    if (returnMangledNames) {

      return {
        code: output.code,
        inputLength: inputLength,
        outputLength: output.code.length,
        mangledGlobalReferenceNames: oftenUsedGlobalReferenceNames
      };
    }

    return {
      code: output.code,
      inputLength: inputLength,
      outputLength: output.code.length
    };
  } catch (e) {

    return {
      error: e
    };
  }
}