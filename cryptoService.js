var crypto = require('crypto'); 
var constants = require('./src/utils/constants'); 
var args = process.argv.slice(2);
var cmdprogram = require('commander');

const algorithm = "aes-256-cbc"; 
let Securitykey = 'Exchange6547wordP22swordExc$$nge'; 
let initVector = 'b364e6196d8db737'; 
var methods = {};

cmdprogram
    .option('--encrypt <string>', 'Encrypt the string')
    .option('--decrypt <string>','Decrypt the string')
    .option('--hash <string>','Hash the string')

cmdprogram.parse(process.argv);

methods.encrypt = (text) => {
    const cipher = crypto.createCipheriv(algorithm, Securitykey, initVector);
    let encryptedData = cipher.update(text, "utf-8", "hex");
    encryptedData += cipher.final("hex");
    return encryptedData;
}

methods.decrypt = (text) => {
    const decipher = crypto.createDecipheriv(algorithm, Securitykey, initVector);
    let decryptedData = decipher.update(text, "hex", "utf-8");
    decryptedData += decipher.final("utf8");
    return decryptedData;
}

methods.hash = () => {
    return crypto.pbkdf2Sync(args[1], constants.HASHING_SALT,  1000, 64, 'sha512').toString('hex');
}
try {
    if(cmdprogram.encrypt) 
        console.log("Encrypted message: "+methods.encrypt(cmdprogram.encrypt));
    else if(cmdprogram.decrypt) 
        console.log("Decrypted message: " + methods.decrypt(cmdprogram.decrypt));    
    else if(cmdprogram.hash) 
        console.log("Hashed message: "+methods.hash(cmdprogram.hash));
} catch (error) {
    console.log(`Operation failed ${error}`);    
}


module.exports = methods;