import Vuex from 'vuex';
import { shallowMount, createLocalVue } from '@vue/test-utils';
import { GlDeprecatedDropdownItem, GlDropdown } from '@gitlab/ui';
import { secondsToHours } from '~/lib/utils/datetime_utility';
import TimezoneDropdown from '~/vue_shared/components/timezone_dropdown.vue';
import createStore from '~/deploy_freeze/store';

const localVue = createLocalVue();
localVue.use(Vuex);

describe('Deploy freeze timezone dropdown', () => {
  let wrapper;
  let store;
  const timezoneDataFixture = getJSONFixture('/api/freeze-periods/timezone_data.json');

  const findTzByName = (identifier = '') =>
    timezoneDataFixture.find(({ name }) => name.toLowerCase() === identifier.toLowerCase());

  const formatTz = ({ offset, name }) => `[UTC ${secondsToHours(offset)}] ${name}`;

  const createComponent = (searchTerm, selectedTimezone) => {
    store = createStore({
      projectId: '8',
      timezoneData: timezoneDataFixture,
    });
    wrapper = shallowMount(TimezoneDropdown, {
      store,
      localVue,
      propsData: {
        value: selectedTimezone,
        timezoneData: timezoneDataFixture,
      },
    });

    wrapper.setData({ searchTerm });
  };

  const findAllDropdownItems = () => wrapper.findAll(GlDeprecatedDropdownItem);
  const findDropdownItemByIndex = index => wrapper.findAll(GlDeprecatedDropdownItem).at(index);

  afterEach(() => {
    wrapper.destroy();
    wrapper = null;
  });

  describe('No time zones found', () => {
    beforeEach(() => {
      createComponent('UTC timezone');
    });

    it('renders empty results message', () => {
      expect(findDropdownItemByIndex(0).text()).toBe('No matching results');
    });
  });

  describe('Search term is empty', () => {
    beforeEach(() => {
      createComponent('');
    });

    it('renders all timezones when search term is empty', () => {
      expect(findAllDropdownItems()).toHaveLength(timezoneDataFixture.length);
    });
  });

  describe('Time zones found', () => {
    beforeEach(() => {
      createComponent('Alaska');
    });

    it('renders only the time zone searched for', () => {
      const selectedTz = findTzByName('Alaska');
      expect(findAllDropdownItems()).toHaveLength(1);
      expect(findDropdownItemByIndex(0).text()).toBe(formatTz(selectedTz));
    });

    it('should not display empty results message', () => {
      expect(wrapper.find('[data-testid="noMatchingResults"]').exists()).toBe(false);
    });

    describe('Custom events', () => {
      const selectedTz = findTzByName('Alaska');

      it('should emit input if a time zone is clicked', () => {
        findDropdownItemByIndex(0).vm.$emit('click');
        expect(wrapper.emitted('input')).toEqual([
          [
            {
              formattedTimezone: formatTz(selectedTz),
              identifier: selectedTz.identifier,
            },
          ],
        ]);
      });
    });
  });

  describe('Selected time zone', () => {
    beforeEach(() => {
      createComponent('', 'Alaska');
    });

    it('renders selected time zone as dropdown label', () => {
      expect(wrapper.find(GlDropdown).vm.text).toBe('Alaska');
    });
  });
});
