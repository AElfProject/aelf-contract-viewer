/**
 * @file Save
 * @author atom-yang
 */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  saveAs
} from 'file-saver';
import {
  Button,
  message
} from 'antd';
import {
  getZip
} from '../../common/utils';

const SaveAsZip = props => {
  const [loading, setIsLoading] = useState(false);
  const {
    title,
    files,
    fileName,
    ...rest
  } = props;

  const download = async () => {
    setIsLoading(true);
    try {
      const blob = await getZip(files);
      saveAs(blob, `${fileName}.zip`);
    } catch (e) {
      message.error('下载失败');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Button
      title={title}
      shape="circle"
      icon="download"
      loading={loading}
      onClick={download}
      {...rest}
    />
  );
};

SaveAsZip.propTypes = {
  files: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    files: PropTypes.arrayOf(PropTypes.object),
    content: PropTypes.string
  })).isRequired,
  fileName: PropTypes.string.isRequired,
  title: PropTypes.string
};

SaveAsZip.defaultProps = {
  title: '下载合约zip文件'
};

export default SaveAsZip;
