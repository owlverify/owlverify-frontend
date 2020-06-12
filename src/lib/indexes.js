// Index collections

module.exports = dbo => {
  // Accounts
  dbo.db().collection("accounts").ensureIndex("owner");
  dbo.db().collection("accounts").ensureIndex("email");
}
