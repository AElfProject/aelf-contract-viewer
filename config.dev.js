module.exports = {
  sql: {
    host: '127.0.0.1',
    port: '3306',
    user: 'root',
    password: 'password',
    database: 'aelf_viewer',
    connectionLimit: 25
  },
  scan: {
    interval: 20000,
    concurrentQueryLimit: 25,
    host: 'http://192.168.197.51:8000',
    maxInsert: 100
  },
  decompiler: {
    interval: 10 * 60 * 1000,
    remoteApi: 'http://192.168.197.35:5566/getfiles'
  },
  wallet: {
    privateKey: 'f6e512a3c259e5f9af981d7f99d245aa5bc52fe448495e0b0dd56e8406be6f71'
  },
  contracts: {
    parliament: 'AElf.ContractNames.Parliament'
  }
};
