import MockAdapter from 'axios-mock-adapter';
import axios from '~/lib/utils/axios_utils';
import httpStatus from '~/lib/utils/http_status';

import { addSubscription, removeSubscription, fetchGroups } from '~/jira_connect/api';

describe('JiraConnect API', () => {
  let mock;
  let response;

  const mockAddPath = 'addPath';
  const mockRemovePath = 'removePath';
  const mockNamespace = 'namespace';
  const mockJwt = 'jwt';
  const mockResponse = { success: true };

  const tokenSpy = jest.fn((callback) => callback(mockJwt));

  window.AP = {
    context: {
      getToken: tokenSpy,
    },
  };

  beforeEach(() => {
    mock = new MockAdapter(axios);
  });

  afterEach(() => {
    mock.restore();
    response = null;
  });

  describe('addSubscription', () => {
    const makeRequest = () => addSubscription(mockAddPath, mockNamespace);

    it('returns success response', async () => {
      jest.spyOn(axios, 'post');
      mock
        .onPost(mockAddPath, {
          jwt: mockJwt,
          namespace_path: mockNamespace,
        })
        .replyOnce(httpStatus.OK, mockResponse);

      response = await makeRequest();

      expect(tokenSpy).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledWith(mockAddPath, {
        jwt: mockJwt,
        namespace_path: mockNamespace,
      });
      expect(response.data).toEqual(mockResponse);
    });
  });

  describe('removeSubscription', () => {
    const makeRequest = () => removeSubscription(mockRemovePath);

    it('returns success response', async () => {
      jest.spyOn(axios, 'delete');
      mock.onDelete(mockRemovePath).replyOnce(httpStatus.OK, mockResponse);

      response = await makeRequest();

      expect(tokenSpy).toHaveBeenCalled();
      expect(axios.delete).toHaveBeenCalledWith(mockRemovePath, {
        params: {
          jwt: mockJwt,
        },
      });
      expect(response.data).toEqual(mockResponse);
    });
  });

  describe('fetchGroups', () => {
    const mockGroupsPath = 'groupsPath';
    const mockPage = 1;
    const mockPerPage = 10;

    const makeRequest = () =>
      fetchGroups(mockGroupsPath, {
        page: mockPage,
        perPage: mockPerPage,
      });

    it('returns success response', async () => {
      jest.spyOn(axios, 'get');
      mock
        .onGet(mockGroupsPath, {
          page: mockPage,
          per_page: mockPerPage,
        })
        .replyOnce(httpStatus.OK, mockResponse);

      response = await makeRequest();

      expect(axios.get).toHaveBeenCalledWith(mockGroupsPath, {
        params: {
          page: mockPage,
          per_page: mockPerPage,
        },
      });
      expect(response.data).toEqual(mockResponse);
    });
  });
});
