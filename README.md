

# js-juicer

> JS Juicer is a small JavaScript library for extra code compression with UglifyJS

## Installation

Install package with NPM and add it to your development dependencies:

`npm install js-juicer --save-dev`

## Usage

```javascript
const jsJuicer = require('js-juicer');
const jsCode = `
   function sendForm() {

       const firstName = document.getElementById('first-name');
       const lastName = document.getElementById('last-name');
       const age = parseInt(document.getElementById('age').value, 10);
       const length = parseInt(document.getElementById('length').value, 10);

       if (FormUtils.isFirstNameValid(firstName)) {

           alert('Please enter first name');
           return;
       }

       if (FormUtils.isLastNameValid(lastName)) {

           alert('Please enter last name');
           return;
       }

       if (FormUtils.isAgeValid(age)) {

           alert('Please enter age');
           return;
       }

       if (FormUtils.isLengthValid(length)) {

           alert('Please enter length');
           return;
       }

       return FormUtils.sendForm({
           firstName: firstName,
           lastName: lastName,
           age: age,
           length: length
     });
   }
`;
const output = jsJuicer.squeeze(jsCode, {
   excludedGlobalReferenceNames: [/* list of excluded globar reference names, for example 'window', 'Object' or 'Zone' */],
   uglifyJSOptions: { /* uglifyJS options */ }
});

console.log(output.code);
/*
   should be next:
   !function(l,n,i,m){!function(){var e=i.getElementById("first-name"),t=i.getElementById("last-name"),a=m(i.getElementById("age").value,10),s=m(i.getElementById("length").value,10);if(l.isFirstNameValid(e))n("Please enter first name");else if(l.isLastNameValid(t))n("Please enter last name");else if(l.isAgeValid(a))n("Please enter age");else{if(!l.isLengthValid(s))return l.sendForm({firstName:e,lastName:t,age:a,length:s});n("Please enter length")}}()}(this.FormUtils,this.alert,this.document,this.parseInt);
*/
```

## Options

- `excludedGlobalReferenceNames` (default `[]`) -- Pass list of global reference names which shouldn't be passed to wrapped code (for example if some global references have deferred initialization)
- `uglifyJSOptions` (default `{}`) -- [minify options](https://github.com/mishoo/UglifyJS2#minify-options) from the UglifyJS API.

## Output

- `code` - minified code
- `inputSize` - size in bytes for input code
- `outputSize` - size in bytes for output code
- `error` - error object for unsuccessful operation
