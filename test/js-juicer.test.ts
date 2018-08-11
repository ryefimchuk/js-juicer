import * as JsJuicer from '../src';

const code1 = `
  var a = parseInt(prompt("Enter a:"));
  var b = parseInt(prompt("Enter b:"));
  alert(a + b);
  `;

const code2 = `
  globalVar = prompt("some text 1");
  if (Math.random() > 0.5) {
    globalVar = prompt("some text 2");
  }
  window.globalVar = globalVar;
  `;

const code3 = `
  text = prompt("some text 1");
  if (Math.random() > 0.5) {
    text = prompt("some text 2");
  } else {
    text = prompt("some text 3");
  }
  window.text = text;
  `;

const code4 = `
  var text = getText();
  if (text === undefined) {
    text = getTextAgain();
    if (text === undefined){
      window.a = function() {
        return getText() !== undefined;
      };
    }
  }
`;

describe('JsJuicer', (): void => {

  test('should load module', function () {

    expect(JsJuicer).toBeDefined();
  });

  test('should mangle code', (): void => {

    const output: JsJuicer.JsJuicerOutput = JsJuicer.squeeze(code1);

    expect(output.code).toBe('!function(t,r){var n=t(r("Enter a:")),a=t(r("Enter b:"));alert(n+a)}(this.parseInt,this.prompt);');
  });

  test('should return mangled global reference names', (): void => {

    const output: JsJuicer.JsJuicerOutput = JsJuicer.squeeze(code1);

    expect('' + output.mangledGlobalReferenceNames === 'parseInt,prompt').toBeTruthy();
  });

  test('should exclude parseInt function', (): void => {

    const output: JsJuicer.JsJuicerOutput = JsJuicer.squeeze(code1, {
      excludedNames: ['parseInt']
    });

    expect(output.code === '!function(t){var r=parseInt(t("Enter a:")),n=parseInt(t("Enter b:"));alert(r+n)}(this.prompt);' && '' + output.mangledGlobalReferenceNames === 'prompt').toBeTruthy();
  });

  test('should mangle global readwrite variable', (): void => {

    const output: JsJuicer.JsJuicerOutput = JsJuicer.squeeze(code2, {
      mangleReadwriteVariables: true
    });

    expect(
      output.code === '!function(t,o){t=o("some text 1"),.5<Math.random()&&(t=o("some text 2")),window.globalVar=t}(this.globalVar,this.prompt);' &&
      '' + output.mangledGlobalReferenceNames === 'globalVar,prompt'
    ).toBeTruthy();
  });

  test('should not mangle global readwrite variable', (): void => {

    const output: JsJuicer.JsJuicerOutput = JsJuicer.squeeze(code2);

    expect(
      output.code === '!function(a){globalVar=a("some text 1"),.5<Math.random()&&(globalVar=a("some text 2")),window.globalVar=globalVar}(this.prompt);' &&
      '' + output.mangledGlobalReferenceNames === 'prompt'
    ).toBeTruthy();
  });

  test('should mangle more or equal than 4 repeated reference names (prompt)', (): void => {

    const output: JsJuicer.JsJuicerOutput = JsJuicer.squeeze(code3, {
      mangleReadwriteVariables: true,
      minRepeatCount: 4
    });

    expect(
      output.code === '!function(t){t=prompt("some text 1"),t=.5<Math.random()?prompt("some text 2"):prompt("some text 3"),window.text=t}(this.text);' &&
      '' + output.mangledGlobalReferenceNames === 'text'
    ).toBeTruthy();
  });

  test('should mangle reference name with min length 5 (prompt)', (): void => {

    const output: JsJuicer.JsJuicerOutput = JsJuicer.squeeze(code3, {
      minNameLength: 5
    });

    expect(
      output.code === '!function(t){text=t("some text 1"),.5<Math.random()?text=t("some text 2"):text=t("some text 3"),window.text=text}(this.prompt);' &&
      '' + output.mangledGlobalReferenceNames === 'prompt'
    ).toBeTruthy();
  });

  test('should return error', (): void => {

    const output: JsJuicer.JsJuicerOutput = JsJuicer.squeeze('a(()');

    expect(output.error).toBeDefined();
  });

  test('should mangle undefined reference', (): void => {

    const output: JsJuicer.JsJuicerOutput = JsJuicer.squeeze(code4);

    expect(
      output.code === '!function(t,i,n){n()===t&&getTextAgain()===t&&(window.a=function(){return n()!==t})}(void 0,this.text,this.getText);' && output.mangledGlobalReferenceNames.indexOf('undefined') !== -1
    ).toBeTruthy();
  });

  test('should mangle with default options', (): void => {

    const output: JsJuicer.JsJuicerOutput = JsJuicer.squeeze(`alert('Hello, world!')`, {});

    expect(output.code).toBeDefined();
  });
});