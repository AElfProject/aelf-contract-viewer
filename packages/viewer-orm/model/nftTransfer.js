/**
 * @file nft_transfer model
 * @author hzz780
 */
const { commonModelOptions } = require('../common/viewer');
const { transferDescription, Transfer } = require('./transfer');

const NftTransfer = Transfer.init(transferDescription, {
  ...commonModelOptions,
  tableName: 'nft_transfer'
});

module.exports = {
  NftTransfer,
  transferDescription
};
