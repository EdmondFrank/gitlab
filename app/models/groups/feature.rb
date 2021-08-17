# frozen_string_literal: true
module Groups
  class Feature < ApplicationRecord
    include Featurable

    self.table_name = 'group_features'

    FEATURES = %i[].freeze

    set_available_features(FEATURES)

    PRIVATE_FEATURES_MIN_ACCESS_LEVEL = {
      merge_requests: Gitlab::Access::REPORTER,
      metrics_dashboard: Gitlab::Access::REPORTER,
      container_registry: Gitlab::Access::REPORTER
    }.freeze

    class << self
      def required_minimum_access_level(feature)
        feature = ensure_feature!(feature)

        PRIVATE_FEATURES_MIN_ACCESS_LEVEL.fetch(feature, Gitlab::Access::GUEST)
      end
    end

    belongs_to :group

    validates :group, presence: true
    validate :allowed_access_levels

    private

    # Validates access level for other than pages cannot be PUBLIC
    def allowed_access_levels
      validator = lambda do |field|
        level = public_send(field) || ENABLED # rubocop:disable GitlabSecurity/PublicSend
        not_allowed = level > ENABLED
        self.errors.add(field, "cannot have public visibility level") if not_allowed
      end

      (FEATURES - %i(pages)).each {|f| validator.call("#{f}_access_level")}
    end

    def get_permission(user, feature)
      case access_level(feature)
      when DISABLED
        false
      when PRIVATE
        team_access?(user, feature)
      when ENABLED
        true
      when PUBLIC
        true
      else
        true
      end
    end

    def team_access?(user, feature)
      return unless user
      return true if user.can_read_all_resources?

      project.team.member?(user, ProjectFeature.required_minimum_access_level(feature))
    end
  end
end

Groups::Feature.prepend_mod_with('Groups::Feature')
