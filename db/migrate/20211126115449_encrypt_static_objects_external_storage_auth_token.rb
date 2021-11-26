# frozen_string_literal: true

class EncryptStaticObjectsExternalStorageAuthToken < Gitlab::Database::Migration[1.0]
  class ApplicationSetting < ActiveRecord::Base
    self.table_name = 'application_settings'
  end

  def up
    ApplicationSetting.reset_column_information

    ApplicationSetting.where('static_objects_external_storage_auth_token_encrypted is NULL AND static_objects_external_storage_auth_token IS NOT NULL').find_each do |application_setting|
      token_encrypted = Gitlab::CryptoHelper.aes256_gcm_encrypt(application_setting.static_objects_external_storage_auth_token)
      application_setting.update!(static_objects_external_storage_auth_token_encrypted: token_encrypted)
    end
  end

  def down
    ApplicationSetting.reset_column_information

    ApplicationSetting.where.not(static_objects_external_storage_auth_token_encrypted: nil).find_each do |application_setting|
      token = Gitlab::CryptoHelper.aes256_gcm_decrypt(application_setting.static_objects_external_storage_auth_token_encrypted)
      application_setting.update!(static_objects_external_storage_auth_token: token, static_objects_external_storage_auth_token_encrypted: nil)
    end
  end
end
