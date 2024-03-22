import 'google-apps-script';



//this is the mail related object, it will send the completed sheets to final recipient
const mailFetcher = (function(){
  let fileToSend;
  const setAttachment = (attach)=> {
    fileToSend = DriveApp.getFileById(attach);
  }
  const sendMail = (address,subject,body,Name,modifiedFile) => {
    
    GmailApp.sendEmail(address,subject,body,{
      attachments: [
        fileToSend.getAs(MimeType.CSV),
        modifiedFile
      ],
      
      name: Name
    });

   // tempFile.setTrashed(true); this is how you may delete stuff alter
   driveFolder.deleteTemporaryFiles(fileToSend);
  };
  return {sendMail,setAttachment}
})();

//drive related object, it will fetch CSV files when they're uploaded
const driveFolder = (function(){
  let sheet;
  let secondAttachment;
  const templateSheet = DriveApp.getFileById('1tAJq_4vK0Vfi_ATQdaPtk1skqc6X0-oheAyrVaux1_w');
  const setFile = (ID)=> sheet = DriveApp.getFileById(ID);
  const getFile = ()=> sheet;
  // function that creates a dinamic CSV file, copies sheet into it, and returns it
  const createCopyFile = ()=> {   
    
    let parsedData = Utilities.parseCsv(sheet.getBlob().getDataAsString());
    let changedData = '';
    for (let i = 0; i < parsedData.length; i++) {
      changedData += parsedData[i].join(',') + '\n';
    }
    let newFile = DriveApp.createFile('Original reading',changedData,MimeType.CSV);   
   return newFile.getId();
    //note: once the mail is sent, you should delete the new file
  }
  //function that finds all the average values from the raw data and returns them in an array
  const findDataFromApp = ()=> {
      let originalData = Utilities.parseCsv(sheet.getBlob().getDataAsString());
      const recordedValues = [];
      let foundEnd = false;
      for(let i = 0; i < originalData.length; i++)
      {
        for(let j = 0; j < originalData[i].length; j++)
        {
          if(originalData[i][j] === 'Ø')
            recordedValues.push(originalData[i][j+2]);            
          if(originalData[i][j] === 'Máximo total')
          {
            foundEnd = true;
            break;
          }
            
        }
        if(foundEnd)
          break;
      }
      return recordedValues;
  }

  const insertarFormulasSuperior = (arrayOfValues) => {
    const returnArray = [];
    returnArray.push(["="+arrayOfValues.length]);
    returnArray.push(["=AVERAGE(D9:E18)"]);
    returnArray.push(["=SQRT(SUMPRODUCT((D9:E"+ (9+ (Math.ceil(arrayOfValues.length/2) - 1)) +"-D22)^2)/(D21-1))"]);
    returnArray.push(["=(D23*2)/SQRT(D21)"]);
    returnArray.push(["=0.3*(1+5%)"]);
    returnArray.push(["=SQRT(D24^2+D25^2)"]);

    return returnArray;
  };

  

  const loadDataFromApp = ()=> {
    const valuesToUse = findDataFromApp();
    const newSheet = templateSheet.makeCopy('Medicion Hoy');
    const editingSheet = SpreadsheetApp.openById(newSheet.getId()).getActiveSheet();

    const valuesArray = [];  
    
    
    if(valuesToUse.length % 2 === 0)
    {
      for (let i = 0; i < valuesToUse.length/2; i ++) 
        valuesArray.push([valuesToUse[i], valuesToUse[i + valuesToUse.length/2]]);
    }
    else
    {
      for (let i = 0; i <  Math.floor(valuesToUse.length / 2); i ++) 
        valuesArray.push([valuesToUse[i], valuesToUse[i + Math.ceil(valuesToUse.length / 2)]]);
      valuesArray.push([valuesToUse[Math.floor(valuesToUse.length / 2)], '']);
    }
    const calculatedData = insertarFormulasSuperior(valuesToUse);   
    const formulasInferior = [];
    formulasInferior.push(["=PI() * (D29/2000)^2"]);
    formulasInferior.push(["=D22*D32*3600"]);


    let range = editingSheet.getRange("D9:E"+ (9+ (Math.ceil(valuesToUse.length/2) - 1)) +"");
    if(9+ (Math.ceil(valuesToUse.length/2) - 1) < 18)
    {
      editingSheet.getRange("D"+ (9+ (Math.ceil(valuesToUse.length/2))) +":E18").setBackground(editingSheet.getRange("E18").getBackground());
    }
    else
    {
      editingSheet.getRange("D9:E18").setBackground('white');
    }
    
    range.setValues(valuesArray);
    range = editingSheet.getRange('D21:D26');
    range.setFormulas(calculatedData);
    range = editingSheet.getRange('D32:D33');
    range.setFormulas(formulasInferior);
    SpreadsheetApp.flush();
    const returnFile = DriveApp.getFileById(newSheet.getId());
    return returnFile;
  }

  const loadSecondAttachment = ()=> {
    secondAttachment = loadDataFromApp().getId();
    let link = "https://docs.google.com/spreadsheets/d/" +secondAttachment+"/export"
    const parametro = {
    headers: {
      "Authorization": 'Bearer ' + ScriptApp.getOAuthToken(),
    },
    method: 'GET',
    muteHttpExceptions: true
    }     

    const response = UrlFetchApp.fetch(link,parametro);
    const excelFile = response.getBlob().setName('Planilla cargada.xlsx');
    return excelFile;
  };

  const deleteTemporaryFiles = (firstFile)=>{
    Drive.Files.remove(firstFile.getId());
    Drive.Files.remove(secondAttachment);
  };

  return {getFile,setFile,createCopyFile,findDataFromApp,loadSecondAttachment,deleteTemporaryFiles};
})();


const realTimeExecutor = (function(){
  
  const countFiles = (folderID) => {
    const theFolder = DriveApp.getFolderById(folderID);
    const files = theFolder.getFiles();
    let count = 0;
    while (files.hasNext()) {
     let file = files.next();
     count++;
     };
    return count;
  }
  
  
  const checkProperty = (folderID, newC) => 
  {
    const scriptProperties = PropertiesService.getScriptProperties();
    const oldCounter = scriptProperties.getProperty(folderID);
    const newCounter = newC.toString();
    if(oldCounter){
      if(oldCounter==newCounter){
        return false;
      }
      else{
        let numberOfFiles = +newCounter - (+oldCounter);
        scriptProperties.setProperty(folderID, newCounter);  
        return numberOfFiles;
      }
    }
    else{
       scriptProperties.setProperty(folderID, newCounter);  
       return true;
    }
  }

  const runInstanceOfProgram = (fileID)=> {
    //my code that sets off everything
   driveFolder.setFile(fileID); 

   //sets first attachment by copying the raw data and setting it as the attachment variable within object.
   let firstAttatchment = driveFolder.createCopyFile();
   mailFetcher.setAttachment(firstAttatchment);


   //calculates and creates second sheet within driveFolder
   let secondAttachment = driveFolder.loadSecondAttachment();

   //only sets second attachment, as the first one is already set.
   mailFetcher.sendMail('oscar6494@gmail.com','Mail de prueba', 'Se adjuntan los datos en crudo y la planilla generada.','archivos.xlsx',secondAttachment);
  }

  function mainFunction(){
    const folderID = '1hsvtcRs5PYQtu5iP6yIXDdSN7yZGscR-'; //provide here the ID of the folder
    const newCounter = countFiles(folderID);
    const runCode = checkProperty(folderID, newCounter);
    
    if(runCode){
     // here execute your main code
     //    
     var query = "'"+ folderID +"' in parents";
     var files = Drive.Files.list({
       orderBy: "modifiedDate desc",
        q: query
     }).items;
     
     for(let i = 0; i < runCode; i++)
        runInstanceOfProgram(files[i].id);     
     
      console.log("I am executed!");
     //
    }
  }
  return {mainFunction};
})();

function runProgram()
{
  realTimeExecutor.mainFunction();
}

function eventListener()
{
  ScriptApp.newTrigger("runProgram")
  .timeBased()
  .everyMinutes(1)
  .create();
}