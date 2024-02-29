import 'google-apps-script';
//Google Apps needs the empty function to work
function myFunction() {}

//this is the mail related object, it will send the completed sheets to final recipient
const mailFetcher = (function(){
    let fileToSend;
    const setAttachment = (attach)=> {
      fileToSend = DriveApp.getFileById(attach);
    }
    const sendMail = (address,subject,body,Name) => {
      
      GmailApp.sendEmail(address,subject,body,{
        attachments: [fileToSend.getAs(MimeType.CSV)],
        name: Name
      });
    };
    return {sendMail,setAttachment}
  })();

//drive related object, it will fetch CSV files when they're uploaded
const driveFolder = (function(){
    let sheet;
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
  
    return {getFile,setFile,createCopyFile};
  })();

  

driveFolder.setFile('1Fzm-pnhaOkcP4n1T3sZMASDuquYHvASr');


let attatchment = driveFolder.createCopyFile();

mailFetcher.setAttachment(attatchment);
mailFetcher.sendMail('oscar6494@gmail.com','Test file', 'Check attactchment');
