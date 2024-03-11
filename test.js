import 'google-apps-script';


//Google Apps needs the empty function to work

function myFunction() {}


//Need to solve the mail thingy. It sends the file unedited. Maybe you'll need to find the ID again.

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
    const loadDataFromApp = ()=> {
      const valuesToUse = findDataFromApp();
      const newSheet = templateSheet.makeCopy('Medicion Hoy');
      const editingSheet = SpreadsheetApp.openById(newSheet.getId()).getActiveSheet();

      const valuesArray = [];
     /* for (let i = 0; i < valuesToUse.length; i += 2) {
          valuesArray.push([valuesToUse[i], valuesToUse[i + 1]]);
      }*/
      
      
      if(valuesToUse.length % 2 === 0)
      {
        for (let i = 0; i < valuesToUse.length/2; i ++) 
          valuesArray.push([valuesToUse[i], valuesToUse[i + valuesToUse.length/2]]);
      }
      else
      {
        for (let i = 0; i < valuesToUse.length/2; i ++) 
          valuesArray.push([valuesToUse[i], valuesToUse[i + 1 + valuesToUse.length/2]]);
        valuesArray.push([valuesToUse[valuesToUse.length], 0]);
      }        

      let range = editingSheet.getRange('D9:E14');
      range.setValues(valuesArray);
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

driveFolder.setFile('121GgIXCuNLle-bwcMdURSYDkBgF76bPz');

//sets first attachment by copying the raw data and setting it as the attachment variable within object.
let firstAttatchment = driveFolder.createCopyFile();
mailFetcher.setAttachment(firstAttatchment);


//calculates and creates second sheet within driveFolder
let secondAttachment = driveFolder.loadSecondAttachment();

//only sets second attachment, as the first one is already set.
mailFetcher.sendMail('oscar6494@gmail.com','Mail de prueba', 'Se adjuntan los datos en crudo y la planilla generada.','archivos.xlsx',secondAttachment);