/**
 * @file event item
 * @author atom-yang
 */
import React, { useState } from 'react';
import {
  Button,
  message
} from 'antd';
import PropTypes from 'prop-types';
import {
  deserializeLog
} from '../../../../common/utils';

const EventItem = props => {
  const {
    data,
    name,
    address
  } = props;
  const [result, setResult] = useState({ ...(data || {}) });
  const [hasDecoded, setHasDecoded] = useState(false);
  const [loading, setLoading] = useState(false);
  function decode() {
    setLoading(true);
    if (hasDecoded) {
      setResult({
        ...(data || {})
      });
      setHasDecoded(false);
      setLoading(false);
    } else {
      deserializeLog(data, name, address).then(res => {
        setResult(res);
        setLoading(false);
        setHasDecoded(true);
      }).catch(() => {
        message.error('Decode failed');
        setLoading(false);
      });
    }
  }
  return (
    <div className="event-item">
      <textarea
        readOnly
        spellCheck={false}
        className="event-item-text-area"
      >
        {JSON.stringify(result, null, 2)}
      </textarea>
      <Button
        onClick={decode}
        loading={loading}
      >
        {hasDecoded ? 'Decode' : 'Encode'}
      </Button>
    </div>
  );
};

EventItem.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  data: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  address: PropTypes.string.isRequired
};

export default EventItem;
