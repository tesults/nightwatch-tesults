/**
 * nightwatch-tesults.js
 * 
 */
 const fs = require('fs')
 const path = require('path')
 const tesults = require("tesults")
 
 module.exports = {
     write : function(results, options, done) {
       const caseFiles = (suite, name, filesDir) => {
         if (filesDir === undefined || filesDir === null || filesDir === "") {
           return []
         }
         let files = [];
         try {
             const filesPath = path.join(filesDir, suite, name);
             fs.readdirSync(filesPath).forEach(function (file) {
                 if (file !== ".DS_Store") { // Exclude os files
                     files.push(path.join(filesPath, file));
                 }
             });
         } catch (err) { 
             if (err.code === 'ENOENT') {
                 // Normal scenario where no files present: console.log('Tesults error reading case files, check supplied tesults-files arg path is correct.');
             } else {
                 console.log('Tesults error reading case files.')
             }
         }
         return files;
       }
 
       const data = {
         target: 'token',
         results: {
           cases: []
         },
         metadata: {
           integration_name: "nightwatch-tesults",
           integration_version: "1.0.0",
           test_framework: "nightwatch"
         }
       }
 
       if (options.globals.tesults === undefined) {
         console.log("Tesults disabled. No target token supplied (1).")
         done()
         return
       }
 
       if (options.globals.tesults.target === undefined) {
         console.log("Tesults disabled. No target token supplied (2).")
         done()
         return
       }
       data.target = options.globals.tesults.target
       const files = options.globals.tesults.files
       if (options.globals.tesults.build_name !== undefined) {
         let suite = "[build]"
         let result = "unknown"
         if (options.globals.tesults.build_result !== undefined) {
           result = options.globals.tesults.build_result
           if (result !== "pass" && result !== "fail") {
             result = "unknown"
           }
         }
         let buildCase = {
           suite: suite,
           name: options.globals.tesults.build_name,
           result: result,
           rawResult: result,
           desc: options.globals.tesults.build_desc,
           reason: options.globals.tesults.build_reason,
           files: caseFiles(suite, options.globals.tesults.build_name, files)
         }
         data.results.cases.push(buildCase)
       }
 
       if (results.modules !== undefined) {
           Object.keys(results.modules).forEach((moduleName) => {
               let module = results.modules[moduleName]
               if (module.completed !== undefined) {
                 Object.keys(module.completed).forEach((testcaseName) => {
                   let testCaseRaw = module.completed[testcaseName]
                   let result = "unknown"
                   if (testCaseRaw.tests > 0) {
                     if (testCaseRaw.tests === testCaseRaw.passed) {
                       result = "pass"
                     } else if (testCaseRaw.failed > 0) {
                       result = "fail"
                     }
                   }
                   let testCase = {
                     suite: moduleName,
                     name: testcaseName,
                     result: result,
                     duration: testCaseRaw.timeMs,
                     reason: testCaseRaw.lastError
                   }
                   // Files
                   // General
                   let filesArray = caseFiles(testCase.suite, testCase.name, files)
                   // Screenshots
                   let assertions = testCaseRaw.assertions
                   if (assertions) {
                     testCase["_Assertions"] = assertions
                     if (Array.isArray(assertions)) {
                       assertions.forEach((assertion) => {
                         if (assertion.screenshots) {
                           if (Array.isArray(assertion.screenshots)) {
                             assertion.screenshots.forEach((screenshot) => {
                               filesArray.push(screenshot)
                             })
                           }
                         }
                       })
                     }
                   }
                   testCase.files = filesArray
                   testCase["_Http Output"] = testCaseRaw.httpOutput
                   testCase["_Module Path"] = testCaseRaw.modulePath
                   testCase["_Stack Trace"] = testCaseRaw.stackTrace
                   testCase["_Steps"] = testCaseRaw.steps
                   data.results.cases.push(testCase)
                 })
               }
           })
       }
 
       // Tesults upload
       console.log('Tesults results upload...');
       tesults.results(data, function (err, response) {
           if (err) {
               console.log('Tesults library error, failed to upload.');
           } else {
               console.log('Success: ' + response.success);
               console.log('Message: ' + response.message);
               console.log('Warnings: ' + response.warnings.length);
               console.log('Errors: ' + response.errors.length);
           }
           done();
       });
     }
   };