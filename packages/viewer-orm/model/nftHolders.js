/**
 * @file nft holder model
 * @author hzz780
 */
const Sequelize = require('sequelize');
const { commonModelOptions } = require('../common/viewer');

const {
  Model,
  BIGINT,
  STRING
} = Sequelize;

const nftHolderDescription = {
  id: {
    type: BIGINT,
    autoIncrement: true,
    allowNull: false,
    primaryKey: true,
    field: 'id'
  },
  owner: {
    type: STRING(255),
    allowNull: false,
    field: 'owner'
  },
  symbol: {
    type: STRING(255),
    allowNull: false,
    field: 'symbol'
  },
  tokenId: {
    type: STRING(255),
    allowNull: false,
    field: 'token_id'
  },
};

class NftHolder extends Model {
  static async getTokenIdsByOwner(owner, symbol) {
    const whereCondition = {
      owner,
      symbol
    };

    const result = await NftHolder.findAll({
      attributes: [
        'owner',
        'symbol',
        'token_id'
      ],
      order: [
        ['token_id', 'DESC']
      ],
      where: whereCondition
    });
    return result || [];
  }

  static async addOrCreate(item) {
    await NftHolder.findOrCreate({
      where: {
        owner: item.owner,
        symbol: item.symbol,
        tokenId: item.tokenId
      },
      defaults: {
        owner: item.owner,
        symbol: item.symbol,
        tokenId: item.tokenId
      }
    });
  }
}

NftHolder.init(nftHolderDescription, {
  ...commonModelOptions,
  tableName: 'nft_holder'
});

module.exports = {
  NftHolder,
  nftHolderDescription
};
