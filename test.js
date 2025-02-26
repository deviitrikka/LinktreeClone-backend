const bcrypt = require("bcryptjs");

const enteredPassword = "hashHash@123";
const storedHashedPassword = "$2b$10$JAM5ddlFj6DiuVUbIdlqxeVD1f2NLrcxTPjHcvjaH0DXYV3VLI/9y";

bcrypt.compare(enteredPassword, storedHashedPassword).then((match) => {
  console.log("Password Match:", match);
});
