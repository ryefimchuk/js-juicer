  
  
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
  
       var firstName = document.getElementById('first-name');
       var lastName = document.getElementById('last-name');
       var age = parseInt(document.getElementById('age').value, 10);
       var length = parseInt(document.getElementById('length').value, 10);
  
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

   sendForm();
`;  
const output = jsJuicer.squeeze(jsCode, { /* options */ });
  
console.log(output.code);  
/*  
   should be next:  
   !function(l,n,i,m){!function(){var e=l.getElementById("first-name"),t=l.getElementById("last-name"),a=n(l.getElementById("age").value,10),s=n(l.getElementById("length").value,10);if(i.isFirstNameValid(e))m("Please enter first name");else if(i.isLastNameValid(t))m("Please enter last name");else if(i.isAgeValid(a))m("Please enter age");else{if(!i.isLengthValid(s))return i.sendForm({firstName:e,lastName:t,age:a,length:s});m("Please enter length")}}()}(this.document,this.parseInt,this.FormUtils,this.alert);

   for example pure uglifyJS minification
   function sendForm(){var e=document.getElementById("first-name"),t=document.getElementById("last-name"),a=parseInt(document.getElementById("age").value,10),l=parseInt(document.getElementById("length").value,10);if(FormUtils.isFirstNameValid(e))alert("Please enter first name");else if(FormUtils.isLastNameValid(t))alert("Please enter last name");else if(FormUtils.isAgeValid(a))alert("Please enter age");else{if(!FormUtils.isLengthValid(l))return FormUtils.sendForm({firstName:e,lastName:t,age:a,length:l});alert("Please enter length")}}sendForm();
*/  
```  
  
## Options  
  
- `minifyOptions` (default `{}`) -- [minify options](https://github.com/mishoo/UglifyJS2#minify-options) from the UglifyJS API
- `mangleReadwriteVariables` (default `false`)  -- if enabled then global reference name in the assignment will be mangled
- `excludedNames` (default `[]`) -- List of global reference names which shouldn't be mangled (for example if some global references have deferred initialization) 
- `minRepeatCount` (default `2`) -- min number of repeats for reference name
- `minNameLength` (default `2`) -- min name length
  
## Output  
  
- `code` - minified code  
- `minifyOutput` - [minify result](https://github.com/mishoo/UglifyJS2) from the UglifyJS API
- `error` - error object for unsuccessful operation