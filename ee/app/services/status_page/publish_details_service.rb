# frozen_string_literal: true

module StatusPage
  # Render an issue as incident details and publish them to CDN.
  #
  # This is an internal service which is part of
  # +StatusPage::PublishService+ and is not meant to be called directly.
  #
  # Consider calling +StatusPage::PublishService+ instead.
  class PublishDetailsService < PublishBaseService
    private

    def process(issue, user_notes)
      publish_json_response = publish_json(issue, user_notes)
      return publish_json_response if publish_json_response.error?

      publish_images(issue, user_notes)

      success
    end

    # Publish Json

    def publish_json(issue, user_notes)
      json = serialize(issue, user_notes)
      key = json_object_key(json)
      return error('Missing object key') unless key

      upload_json(key, json)
    end

    def serialize(issue, user_notes)
      serializer.represent_details(issue, user_notes)
    end

    def json_object_key(json)
      id = json[:id]
      return unless id

      StatusPage::Storage.details_path(id)
    end

    # Publish Images
    def publish_images(issue, user_notes)
      existing_image_keys = storage_client.list_object_keys(StatusPage::Storage.uploads_path(issue.iid))
      # Send all description images to s3
      total_uploads = existing_image_keys.size

      publish_markdown_uploads(
        markdown_field: issue.description,
        issue_iid: issue.iid,
        existing_image_keys: existing_image_keys,
        total_uploads: total_uploads
      )

      # Send all comment images to s3
      user_notes.each do |user_note|
        publish_markdown_uploads(
          markdown_field: user_note.note,
          issue_iid: issue.iid,
          existing_image_keys: existing_image_keys,
          total_uploads: total_uploads
        )
      end
    end

    def publish_markdown_uploads(markdown_field:, issue_iid:, existing_image_keys:, total_uploads:)
      markdown_field.scan(FileUploader::MARKDOWN_PATTERN).map do |secret, file_name|
        break if total_uploads >= StatusPage::Storage::MAX_IMAGE_UPLOADS

        key = StatusPage::Storage.upload_path(issue_iid, secret, file_name)

        next if existing_image_keys.include? key

        uploader = UploaderFinder.new(@project, secret, file_name).execute
        uploader.open do |open_file|
          storage_client.multipart_upload(key, open_file)
          total_uploads += 1
        end
      end
    end
  end
end
