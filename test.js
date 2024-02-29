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
    };
    return {sendMail,setAttachment}
  })();

//drive related object, it will fetch CSV files when they're uploaded
const driveFolder = (function(){
    let sheet;
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

      const valuesArray = valuesToUse.map(value => [value]);

      let range = editingSheet.getRange('D9:D11');
      range.setValues(valuesArray);
      return newSheet;
    }

    return {getFile,setFile,createCopyFile,findDataFromApp,loadDataFromApp};
  })();

  

driveFolder.setFile('1Fzm-pnhaOkcP4n1T3sZMASDuquYHvASr');


let firstAttatchment = driveFolder.createCopyFile();
let secondAttachment = driveFolder.loadDataFromApp();

mailFetcher.setAttachment(firstAttatchment);
mailFetcher.sendMail('oscar6494@gmail.com','Test file', 'Check attactchment','archivos',secondAttachment);
