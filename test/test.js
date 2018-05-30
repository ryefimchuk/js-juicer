var assert = require('assert');

var code1 = '' +
    'var a = parseInt(prompt("Enter a:"));' +
    'var b = parseInt(prompt("Enter b:"));' +
    'alert(a + b);' +
    '';

var code2 = '' +
    'globalVar = prompt("some text 1");' +
    'if (Math.random() > 0.5) {' +
    '   globalVar = prompt("some text 2");' +
    '}' +
    'window.globalVar = globalVar' +
    '';

var code3 = '' +
    'text = prompt("some text 1");' +
    'if (Math.random() > 0.5) {' +
    '   text = prompt("some text 2");' +
    '} else {' +
    '   text = prompt("some text 3");' +
    '}' +
    'window.text = text' +
    '';

describe('jsJuice', function () {

    var jsJuice = require('./../index');

    it('should load module', function () {

        assert.notEqual(jsJuice, undefined);
    });

    it('should mangle code', function () {

        var output = jsJuice.squeeze(code1);

        assert.equal(output.code, '!function(t,r){var n=t(r("Enter a:")),a=t(r("Enter b:"));alert(n+a)}(this.parseInt,this.prompt);');
    });

    it('should return mangled global reference names', function () {

        var output = jsJuice.squeeze(code1, {
            returnMangledNames: true
        });

        assert.equal(true, '' + output.mangledGlobalReferenceNames === 'parseInt,prompt');
    });

    it('should exclude parseInt function', function () {

        var output = jsJuice.squeeze(code1, {
            excludedNames: ['parseInt'],
            returnMangledNames: true
        });

        assert.equal(true, output.code === '!function(t){var r=parseInt(t("Enter a:")),n=parseInt(t("Enter b:"));alert(r+n)}(this.prompt);' && '' + output.mangledGlobalReferenceNames === 'prompt');
    });

    it('should mangle global readwrite variable', function () {

        var output = jsJuice.squeeze(code2, {
            mangleReadwriteVariables: true,
            returnMangledNames: true
        });

        assert.equal(
            true,
            output.code === '!function(t,o){t=o("some text 1"),.5<Math.random()&&(t=o("some text 2")),window.globalVar=t}(this.globalVar,this.prompt);' &&
            '' + output.mangledGlobalReferenceNames === 'globalVar,prompt'
        );
    });

    it('should not mangle global readwrite variable', function () {

        var output = jsJuice.squeeze(code2, {
            returnMangledNames: true
        });

        assert.equal(
            true,
            output.code === '!function(a){globalVar=a("some text 1"),.5<Math.random()&&(globalVar=a("some text 2")),window.globalVar=globalVar}(this.prompt);' &&
            '' + output.mangledGlobalReferenceNames === 'prompt'
        );
    });

    it('should mangle more or equal than 4 repeated reference names (prompt)', function () {

        var output = jsJuice.squeeze(code3, {
            mangleReadwriteVariables: true,
            returnMangledNames: true,
            minRepeatCount: 4
        });

        assert.equal(
            true,
            output.code === '!function(t){t=prompt("some text 1"),t=.5<Math.random()?prompt("some text 2"):prompt("some text 3"),window.text=t}(this.text);' &&
            '' + output.mangledGlobalReferenceNames === 'text'
        );
    });

    it('should mangle reference name with min length 5 (prompt)', function () {

        var output = jsJuice.squeeze(code3, {
            returnMangledNames: true,
            minNameLength: 5
        });

        assert.equal(
            true,
            output.code === '!function(t){text=t("some text 1"),.5<Math.random()?text=t("some text 2"):text=t("some text 3"),window.text=text}(this.prompt);' &&
            '' + output.mangledGlobalReferenceNames === 'prompt'
        );
    });
});