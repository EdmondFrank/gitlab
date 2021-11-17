<script>
import { GlFormInputGroup, GlFormGroup, GlSprintf, GlButton, GlLoadingIcon } from '@gitlab/ui';

import axios from '~/lib/utils/axios_utils';
import createFlash from '~/flash';
import ClipboardButton from '~/vue_shared/components/clipboard_button.vue';
import { s__ } from '~/locale';

export default {
  name: 'ScimToken',
  components: {
    GlFormInputGroup,
    GlFormGroup,
    GlSprintf,
    ClipboardButton,
    GlButton,
    GlLoadingIcon,
  },
  i18n: {
    copyToken: s__('GroupSaml|Copy SCIM token'),
    copyEndpointUrl: s__('GroupSaml|Copy SCIM API endpoint URL'),
    tokenLabel: s__('GroupSaml|Your SCIM token'),
    endpointUrlLabel: s__('GroupSaml|SCIM API endpoint URL'),
    tokenVisibleDescription: s__(
      "GroupSAML|Make sure you save this token — you won't be able to access it again.",
    ),
    tokenHiddenDescription: s__(
      'GroupSAML|The SCIM token is now hidden. To see the value of the token again, you need to %{linkStart}reset it.%{linkEnd}',
    ),
    resetTokenErrorMessage: s__(
      'GroupSAML|An error occurred resetting your SCIM token. Please try agian.',
    ),
  },
  inject: ['initialEndpointUrl', 'resetTokenPath'],
  data() {
    return {
      loading: false,
      token: null,
      endpointUrl: this.initialEndpointUrl,
    };
  },
  computed: {
    tokenVisible() {
      return this.token !== null;
    },
    tokenInputValue() {
      return this.tokenVisible ? this.token : '*'.repeat(20);
    },
  },
  methods: {
    async resetToken() {
      this.loading = true;

      try {
        const {
          data: { scim_api_url: endpointUrl, scim_token: token },
        } = await axios.post(this.resetTokenPath);

        this.token = token;
        this.endpointUrl = endpointUrl;
      } catch (error) {
        createFlash({
          message: this.$options.i18n.resetTokenErrorMessage,
          captureError: true,
          error,
        });
      }

      this.loading = false;
    },
  },
};
</script>

<template>
  <div class="gl-mt-5 relative">
    <div
      class="gl-absolute gl-top-5 gl-left-0 gl-right-0 gl-display-flex gl-justify-content-center"
    >
      <gl-loading-icon v-if="loading" size="md" />
    </div>
    <div :class="{ 'gl-visibility-hidden': loading }">
      <gl-form-group :label="$options.i18n.tokenLabel" label-for="scim_token">
        <gl-form-input-group
          id="scim_token"
          class="gl-form-input-xl"
          :value="tokenInputValue"
          select-on-click
          readonly
        >
          <template v-if="tokenVisible" #append>
            <clipboard-button :text="token" :title="$options.i18n.copyToken" />
          </template>
        </gl-form-input-group>
        <template #description>
          <template v-if="tokenVisible">
            {{ $options.i18n.tokenVisibleDescription }}
          </template>
          <gl-sprintf v-else :message="$options.i18n.tokenHiddenDescription">
            <template #link="{ content }">
              <gl-button variant="link" @click="resetToken">{{ content }}</gl-button>
            </template>
          </gl-sprintf>
        </template>
      </gl-form-group>
      <gl-form-group :label="$options.i18n.endpointUrlLabel" label-for="scim_token_endpoint_url">
        <gl-form-input-group
          id="scim_token_endpoint_url"
          class="gl-form-input-xl"
          :value="endpointUrl"
          select-on-click
          readonly
        >
          <template #append>
            <clipboard-button :text="endpointUrl" :title="$options.i18n.copyEndpointUrl" />
          </template>
        </gl-form-input-group>
      </gl-form-group>
    </div>
  </div>
</template>
