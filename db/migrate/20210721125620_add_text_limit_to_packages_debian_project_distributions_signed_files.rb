# frozen_string_literal: true

class AddTextLimitToPackagesDebianProjectDistributionsSignedFiles < ActiveRecord::Migration[6.1]
  include Gitlab::Database::MigrationHelpers
  disable_ddl_transaction!

  def up
    add_text_limit :packages_debian_project_distributions, :signed_file, 255
  end

  def down
    remove_text_limit :packages_debian_project_distributions, :signed_file
  end
end
