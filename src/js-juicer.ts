import * as UglifyJS from 'uglify-js';
import * as esprima from 'esprima';

const escope = require('escope');

export interface JsJuicerOptions {

  minifyOptions?: UglifyJS.MinifyOptions;
  mangleReadwriteVariables?: boolean;
  excludedNames?: string[];
  minRepeatCount?: number;
  minNameLength?: number;
}

export interface JsJuicerOutput {

  code?: string;
  minifyOutput?: UglifyJS.MinifyOutput;
  mangledGlobalReferenceNames?: string[];
  error?: any;
}

function hasUndefined(globalReferenceNames: string[]): boolean {
  return globalReferenceNames.indexOf('undefined') !== -1;
}

function withoutUndefined(globalReferenceNames: string[]): string[] {
  return globalReferenceNames.filter((globalReferenceName: string): boolean => globalReferenceName !== 'undefined');
}

function getIIFEBody(code: string, globalReferenceNames: string[]): string {

  if (hasUndefined(globalReferenceNames)) {

    return `(function(undefined,${withoutUndefined(globalReferenceNames).join(',')}){${code}})`;
  }

  return `(function(${globalReferenceNames.join(',')}){${code}})`;
}

function getImplicitlySafeCodeInvocation(globalReferenceNames: string[]): string {

  if (hasUndefined(globalReferenceNames)) {

    return `.apply(this,void 0,"${withoutUndefined(globalReferenceNames).join(',')}".split(",").map(function(k){return this[k]}))`;
  }

  return `.apply(this,"${globalReferenceNames.join(',')}".split(",").map(function(k){return this[k]}))`;
}

function getExplicitlySafeCodeInvocation(globalReferenceNames: string[]): string {

  if (hasUndefined(globalReferenceNames)) {

    return `(void 0,${withoutUndefined(globalReferenceNames).map((globalReferenceName: string): string => `this.${globalReferenceName}`).join(',')})`;
  }

  return `(${globalReferenceNames.map((globalReferenceName: string): string => `this.${globalReferenceName}`).join(',')})`;
}

function getWrappedCode(code: string, globalReferenceNames: string[]): string {

  const iifeBody: string = getIIFEBody(code, globalReferenceNames);
  const implicitlySafeCodeInvocation: string = getImplicitlySafeCodeInvocation(globalReferenceNames);
  const explicitlySafeCodeInvocation: string = getExplicitlySafeCodeInvocation(globalReferenceNames);

  /* istanbul ignore next */
  if (implicitlySafeCodeInvocation.length < explicitlySafeCodeInvocation.length) {

    return iifeBody + implicitlySafeCodeInvocation;
  }

  return iifeBody + explicitlySafeCodeInvocation;
}

export function squeeze(code: string, {
  minifyOptions = {},
  mangleReadwriteVariables = false,
  excludedNames = [],
  minRepeatCount = 2,
  minNameLength = 2
}: JsJuicerOptions = {}): JsJuicerOutput {

  try {

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

    /* istanbul ignore next */
    if (output.error) {

      return {
        minifyOutput: output,
        error: output.error
      };
    }

    return {
      code: output.code,
      minifyOutput: output,
      mangledGlobalReferenceNames: oftenUsedGlobalReferenceNames
    };
  } catch (e) {

    return {
      error: e
    };
  }
}