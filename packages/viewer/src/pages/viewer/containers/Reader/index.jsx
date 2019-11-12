/**
 * @file Viewer
 * @author atom-yang
 */
import React, {
  useEffect,
  useState,
  lazy,
  Suspense
} from 'react';
import { useSearchParam } from 'react-use';
import { If, Then, Else } from 'react-if';
import { Skeleton, message } from 'antd';
// import Viewer from '../../components/Viewer';
import FileTree from '../../components/FileTree';
import { request } from '../../../../common/request';
import { API_PATH } from '../../common/constants';
import './index.less';

const Viewer = lazy(() => import(/* webpackChunkName: "viewer" */ '../../components/Viewer'));

function getDefaultFile(files = [], names = [], index = 0, path = '') {
  const filtered = files.filter(v => v.name === names[index]);
  if (filtered.length === 0) {
    return {};
  }
  const newPath = `${path}${filtered[0].name}/`;
  if (index === names.length - 1) {
    if (Array.isArray(filtered[0].files)) {
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
    result = JSON.parse(data.files);
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

const Reader = () => {
  const address = useSearchParam('address');
  const codeHash = useSearchParam('codeHash');
  const [files, setFiles] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [history, setHistory] = useState([]);
  const [hasFetched, setFetched] = useState(false);
  const [viewerConfig, setViewerConfig] = useState({});
  useEffect(() => {
    if (address) {
      setFetched(false);
      Promise.all([
        request(API_PATH.GET_HISTORY, {
          address
        }, { method: 'GET' }),
        request(API_PATH.GET_FILES, {
          address
        }, { method: 'GET' })
      ]).then(([historyList, filesData]) => {
        if (historyList.length === 0) {
          throw new Error('There is no such contract');
        }
        const {
          result,
          defaultFile
        } = handleFiles(filesData);
        setFiles(result);
        setViewerConfig(defaultFile);
        setHistory(historyList);
        setFetched(true);
      }).catch(e => {
        message.error(e.message || e.msg);
        // setFetched(true);
      });
    } else if (codeHash) {
      request(API_PATH.GET_FILES, {
        codeHash
      }, { method: 'GET' })
        .then(data => {
          if (Object.keys(data).length === 0) {
            throw new Error('There is no such contract');
          }
          const {
            result,
            defaultFile
          } = handleFiles(data);
          setFiles(result);
          setViewerConfig(defaultFile);
          setFetched(true);
        })
        .catch(e => {
          message.error(e.message || e.msg);
        });
    } else {
      message.error('There is no such contract');
      // setFetched(true);
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
    <div className="contract-reader">
      <If condition={hasFetched}>
        <Then>
          <>
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
          </>
        </Then>
        <Else>
          <Skeleton
            active
            paragraph={sketchParagraph}
          />
        </Else>
      </If>
    </div>
  );
};

export default Reader;
