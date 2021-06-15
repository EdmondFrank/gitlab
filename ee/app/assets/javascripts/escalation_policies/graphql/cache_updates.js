import produce from 'immer';
import createFlash from '~/flash';

import { s__ } from '~/locale';

export const DELETE_ESCALATION_POLICY_ERROR = s__(
  'EscalationPolicies|The escalation policy could not be deleted. Please try again.',
);

const addEscalationPolicyToStore = (store, query, { escalationPolicyCreate }, variables) => {
  const policy = escalationPolicyCreate?.escalationPolicy;
  if (!policy) {
    return;
  }

  const sourceData = store.readQuery({
    query,
    variables,
  });

  const data = produce(sourceData, (draftData) => {
    draftData.project.incidentManagementEscalationPolicies.nodes.push(policy);
  });

  store.writeQuery({
    query,
    variables,
    data,
  });
};

const deleteEscalationPolicFromStore = (store, query, { escalationPolicyDestroy }, variables) => {
  const escalationPolicy = escalationPolicyDestroy?.escalationPolicy;

  if (!escalationPolicy) {
    return;
  }

  const sourceData = store.readQuery({
    query,
    variables,
  });

  const data = produce(sourceData, (draftData) => {
    draftData.project.incidentManagementEscalationPolicies.nodes = draftData.project.incidentManagementEscalationPolicies.nodes.filter(
      ({ id }) => id !== escalationPolicy.id,
    );
  });

  store.writeQuery({
    query,
    variables,
    data,
  });
};

export const hasErrors = ({ errors = [] }) => errors?.length;

const onError = (data, message) => {
  createFlash({ message });
  throw new Error(data.errors);
};

export const updateStoreOnEscalationPolicyCreate = (store, query, data, variables) => {
  if (!hasErrors(data)) {
    addEscalationPolicyToStore(store, query, data, variables);
  }
};
export const updateStoreAfterEscalationPolicyDelete = (store, query, data, variables) => {
  if (hasErrors(data)) {
    onError(data, DELETE_ESCALATION_POLICY_ERROR);
  } else {
    deleteEscalationPolicFromStore(store, query, data, variables);
  }
};
