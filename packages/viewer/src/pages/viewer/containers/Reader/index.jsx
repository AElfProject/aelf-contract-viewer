/**
 * @file Viewer
 * @author atom-yang
 */
import React, {
  useEffect,
  useState,
  lazy,
  Suspense,
  useContext
} from 'react';
import PropTypes from 'prop-types';
import { useSearchParam } from 'react-use';
import {
  If,
  Then,
  Switch,
  Case
} from 'react-if';
import {
  Result,
  Skeleton,
  message,
  Steps,
  Divider,
  Icon,
  Alert
} from 'antd';
import {
  innerHeight,
  sendMessage
} from '../../../../common/utils';
import FileTree from '../../components/FileTree';
import Header from '../../components/Header';
import SaveAsZip from '../../components/Save';
import { request } from '../../../../common/request';
import { API_PATH } from '../../common/constants';
import { GlobalContext } from '../../common/context';
import './index.less';
import config from '../../../../common/config';
import {
  LinkIcon,
  CodeIcon
} from '../../common/Icon';

const Viewer = lazy(() => import(/* webpackChunkName: "viewer" */ '../../components/Viewer'));

function getDefaultFile(files = [], names = [], index = 0, path = '') {
  const filtered = files.filter(v => v.name === names[index]);
  if (filtered.length === 0) {
    return {};
  }
  const newPath = `${path}${filtered[0].name}/`;
  if (index === names.length - 1) {
    if (Array.isArray(filtered[0].files) && filtered[0].files.length > 0) {
      return {
        ...filtered[0].files[0],
        path: `${newPath}${filtered[0].files[0].name}`
      };
    }
    return {
      ...filtered[0],
      path: `${path}${filtered[0].name}`
    };
  }
  if (Array.isArray(filtered[0].files)) {
    return getDefaultFile(filtered[0].files, names, index + 1, newPath);
  }
  return {
    ...filtered[0],
    path: newPath
  };
}

function handleFiles(data) {
  let defaultFile;
  let result;
  try {
    result = JSON.parse(data.files || '[]');
  } catch (e) {
    result = data.files;
  } finally {
    defaultFile = getDefaultFile(result, [result[0].name]);
  }
  return {
    result,
    defaultFile
  };
}

const sketchParagraph = {
  rows: 10,
  width: '100%'
};

const ViewerFallback = <Skeleton active paragraph={sketchParagraph} />;

const { Step } = Steps;

const StepDescription = props => {
  const {
    address,
    author,
    codeHash,
    txId,
    version,
    blockHeight
  } = props;
  return (
    <>
      <div className="description-item">
        <span>合约作者: </span>
        <a
          href={`${config.viewer.addressUrl}/${author}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {`${config.viewer.prefix}_${author}_${config.viewer.chainId}`}
          <LinkIcon
            className="gap-left-small"
          />
        </a>
      </div>
      <div className="description-item">
        <span>合约代码Hash: </span>
        <a
          href={`${config.viewer.viewerUrl}?codeHash=${codeHash}&address=${address}`}
        >
          {codeHash}
        </a>
      </div>
      <div className="description-item">
        <span>合约版本: </span>
        <a
          href={`${config.viewer.viewerUrl}?codeHash=${codeHash}&address=${address}`}
        >
          {version}
        </a>
      </div>
      <div className="description-item">
        <span>交易Id: </span>
        <a
          href={`${config.viewer.txUrl}/${txId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {txId}
          <LinkIcon
            className="gap-left-small"
          />
        </a>
      </div>
      <div className="description-item">
        <span>交易区块高度: </span>
        <a
          href={`${config.viewer.blockUrl}/${blockHeight}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {blockHeight}
          <LinkIcon
            className="gap-left-small"
          />
        </a>
      </div>
    </>
  );
};

StepDescription.propTypes = {
  address: PropTypes.string.isRequired,
  version: PropTypes.string.isRequired,
  author: PropTypes.string.isRequired,
  codeHash: PropTypes.string.isRequired,
  txId: PropTypes.string.isRequired,
  blockHeight: PropTypes.number.isRequired
};

const EventMap = {
  CodeUpdated: '更新合约',
  AuthorChanged: '更改合约作者',
  ContractDeployed: '合约部署'
};

const fetchingStatusMap = {
  FETCHING: 'fetching',
  ERROR: 'error',
  SUCCESS: 'success'
};

const Reader = () => {
  const global = useContext(GlobalContext);
  const {
    isMobile = false
  } = global;
  const address = useSearchParam('address');
  const codeHash = useSearchParam('codeHash');
  const [files, setFiles] = useState([]);
  const [contractInfo, setContractInfo] = useState({});
  const [error, setError] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [history, setHistory] = useState([]);
  const [fetchingStatus, setFetchingStatus] = useState(fetchingStatusMap.FETCHING);
  const [viewerConfig, setViewerConfig] = useState({});
  useEffect(() => {
    innerHeight().then(height => {
      sendMessage({ height });
    }).catch(err => {
      console.error(err);
    });
  }, []);
  useEffect(() => {
    let promise;
    if (codeHash && address) {
      setFetchingStatus(fetchingStatusMap.FETCHING);
      promise = request(API_PATH.GET_FILES, {
        codeHash,
        address
      }, { method: 'GET' }).then(filesData => {
        if (Object.keys(filesData || {}).length === 0) {
          throw new Error('暂无此合约');
        }
        return filesData;
      });
    } else if (address && !codeHash) {
      setFetchingStatus(fetchingStatusMap.FETCHING);
      promise = Promise.all([
        request(API_PATH.GET_HISTORY, {
          address
        }, { method: 'GET' }),
        request(API_PATH.GET_FILES, {
          address
        }, { method: 'GET' })
      ]).then(([historyList, filesData]) => {
        if (historyList.length === 0) {
          throw new Error('暂无此合约');
        }
        setHistory(historyList);
        return filesData;
      });
    } else {
      setFetchingStatus(fetchingStatusMap.ERROR);
      message.error('暂无此合约');
      setError(new Error('暂无此合约'));
    }
    if (promise) {
      promise.then(data => {
        const {
          files: resFiles
        } = data;
        if (!resFiles) {
          throw new Error('代码正在反编译中，请稍等...');
        }
        const {
          result,
          defaultFile
        } = handleFiles(data);
        setFiles(result);
        setViewerConfig(defaultFile);
        setFetchingStatus(fetchingStatusMap.SUCCESS);
        const info = {
          ...data
        };
        delete info.files;
        setContractInfo(info);
      }).catch(e => {
        message.error(e.message || e.msg);
        setError(e);
        setFetchingStatus(fetchingStatusMap.ERROR);
      });
    }
  }, [address]);

  const onFileChange = names => {
    const selectedFile = getDefaultFile(files, names);
    if (Object.keys(selectedFile).length > 0) {
      setViewerConfig({
        ...selectedFile
      });
    }
  };

  return (
    <div className="reader">
      <Switch>
        <Case condition={fetchingStatus === fetchingStatusMap.SUCCESS}>
          <>
            <Header
              address={contractInfo.address || ''}
              author={contractInfo.author || ''}
              isSystemContract={contractInfo.isSystemContract || false}
            />
            <If condition={isMobile}>
              <Then>
                <Alert
                  message="在PC浏览器上打开以获得最佳的浏览效果"
                  type="warning"
                  className="gap-bottom"
                />
              </Then>
            </If>
            <h2>
              <CodeIcon
                className="gap-right"
              />
              Contract Info
              <SaveAsZip
                className="gap-left"
                files={files}
                fileName={address || codeHash || 'contract'}
              />
            </h2>
            <div className="contract-reader">
              <FileTree
                files={files}
                onChange={onFileChange}
              />
              <Suspense fallback={ViewerFallback}>
                <Viewer
                  content={viewerConfig.content || ''}
                  name={viewerConfig.name || ''}
                  path={viewerConfig.path || ''}
                />
              </Suspense>
            </div>
            <If condition={!codeHash}>
              <Then>
                <div
                  className="contract-history"
                >
                  <h2><Icon className="gap-right" type="history" />合约历史</h2>
                  <Divider />
                  <Steps
                    progressDot
                    current={0}
                    direction="vertical"
                  >
                    {history.map(v => (
                      <Step
                        key={v.txId}
                        title={EventMap[v.event]}
                        subTitle={v.updateTime}
                        description={<StepDescription {...v} />}
                      />
                    ))}
                  </Steps>
                </div>
              </Then>
            </If>
          </>
        </Case>
        <Case condition={fetchingStatus === fetchingStatusMap.FETCHING}>
          <Skeleton
            active
            paragraph={sketchParagraph}
          />
        </Case>
        <Case condition={fetchingStatus === fetchingStatusMap.ERROR}>
          <Result
            status="error"
            title={error.message || error.msg || '网络错误，请稍后重试'}
            subTitle="请确认合约地址无误"
          />
        </Case>
      </Switch>
    </div>
  );
};

export default Reader;
