<?php

/**
 * BookingResource.Get API specification (optional)
 * This is used for documentation and validation.
 *
 * @param array $spec description of fields supported by this API call
 * @return void
 * @see http://wiki.civicrm.org/confluence/display/CRM/API+Architecture+Standards
 */
function _civicrm_api3_booking_resource_create_spec(&$spec) {
  //$spec['magicword']['api.required'] = 1;
}

/**
 * BookingResource.Create API
 *
 * @param array $params
 * @return array API result descriptor
 * @see civicrm_api3_create_success
 * @see civicrm_api3_create_error
 * @throws API_Exception
 */
function civicrm_api3_booking_resource_create($params) {
  return _civicrm_api3_basic_create('CRM_Civibooking_BAO_Resource', $params);

  //return _civicrm_api3_basic_create(_civicrm_api3_get_BAO(__FUNCTION__), $params);
}


/**
 * BookingResource.Get API
 *
 * @param array $params
 * @return array API result descriptor
 * @see civicrm_api3_create_success
 * @see civicrm_api3_create_error
 * @throws API_Exception
 */
function civicrm_api3_booking_resource_get($params) {
  return _civicrm_api3_basic_get('CRM_Civibooking_BAO_Resource', $params);

  //return _civicrm_api3_basic_get(_civicrm_api3_get_BAO(__FUNCTION__), $params);
}




