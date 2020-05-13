/**
 * @file bread
 * @author atom-yang
 */
import React from 'react';
import PropTypes from 'prop-types';
import {
  Divider
} from 'antd';
import './index.less';

const Bread = props => {
  const {
    title,
    subTitle
  } = props;
  // const {
  //   pathname
  // } = useLocation();
  // const paths = pathname.split('/').filter(v => !!v);
  return (
    <>
      <div className="address-bread">
        <div className="breadcrumb-title text-ellipsis">
          <h2>{title}</h2>
          {subTitle ? (<span className="sub-title gap-left-small">#{subTitle}</span>) : null}
        </div>
      </div>
      <Divider className="address-bread-divider" />
    </>
  );
};

Bread.propTypes = {
  title: PropTypes.node.isRequired,
  subTitle: PropTypes.node
};
Bread.defaultProps = {
  subTitle: ''
};

export default Bread;
