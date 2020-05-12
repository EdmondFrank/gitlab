# frozen_string_literal: true

require 'spec_helper'

describe StatusPage::PublishDetailsService do
  let_it_be(:project, refind: true) { create(:project) }
  let(:markdown_field) { 'Hello World' }
  let(:user_notes) { [] }
  let(:incident_id) { 1 }
  let(:issue) { instance_double(Issue, notes: user_notes, description: markdown_field, iid: incident_id) }
  let(:key) { StatusPage::Storage.details_path(incident_id) }
  let(:content) { { id: incident_id } }

  let(:service) { described_class.new(project: project) }

  subject(:result) { service.execute(issue, user_notes) }

  describe '#execute' do
    before do
      allow(serializer).to receive(:represent_details).with(issue, user_notes)
        .and_return(content)
    end

    include_examples 'publish incidents'

    context 'when serialized content is missing id' do
      let(:content) { { other_id: incident_id } }

      it 'returns an error' do
        expect(result).to be_error
        expect(result.message).to eq('Missing object key')
      end
    end

    context 'publishes image uploads' do
      before do
        allow(storage_client).to receive(:upload_object).with("data/incident/1.json", "{\"id\":1}")
        allow(storage_client).to receive(:list_object_keys).and_return(Set.new)
      end

      context 'when not in markdown' do
        it 'publishes no images' do
          expect(storage_client).not_to receive(:multipart_upload)
          expect(result.payload).to eq({})
          expect(result).to be_success
        end
      end

      context 'when in markdown' do
        let(:upload_secret) { '734b8524a16d44eb0ff28a2c2e4ff3c0' }
        let(:image_file_name) { 'tanuki.png'}
        let(:upload_path) { "/uploads/#{upload_secret}/#{image_file_name}" }
        let(:markdown_field) { "![tanuki](#{upload_path})" }
        let(:status_page_upload_path) { StatusPage::Storage.upload_path(issue.iid, upload_secret, image_file_name) }
        let(:user_notes) { [] }

        let(:open_file) { instance_double(File, read: 'stubbed read') }
        let(:uploader) { instance_double(FileUploader) }

        before do
          allow(uploader).to receive(:open).and_yield(open_file).twice

          allow_next_instance_of(UploaderFinder) do |finder|
            allow(finder).to receive(:execute).and_return(uploader)
          end

          allow(storage_client).to receive(:list_object_keys).and_return(Set[])
          allow(storage_client).to receive(:upload_object)
        end

        it 'publishes description images' do
          expect(storage_client).to receive(:multipart_upload).with(status_page_upload_path, open_file).once

          expect(result).to be_success
          expect(result.payload).to eq({})
        end

        context 'user notes uploads' do
          let(:user_note) { instance_double(Note, note: markdown_field) }
          let(:user_notes) { [user_note] }
          let(:issue) { instance_double(Issue, notes: user_notes, description: '', iid: incident_id) }

          it 'publishes images' do
            expect(storage_client).to receive(:multipart_upload).with(status_page_upload_path, open_file).once

            expect(result).to be_success
            expect(result.payload).to eq({})
          end
        end

        context 'when exceeds upload limit' do
          before do
            stub_const("StatusPage::Storage::MAX_IMAGE_UPLOADS", 1)
            allow(storage_client).to receive(:list_object_keys).and_return(Set[status_page_upload_path])
          end

          it 'publishes no images' do
            expect(storage_client).not_to receive(:multipart_upload)

            expect(result).to be_success
            expect(result.payload).to eq({})
          end
        end

        context 'when all images are in s3' do
          before do
            allow(storage_client).to receive(:list_object_keys).and_return(Set[status_page_upload_path])
          end

          it 'publishes no images' do
            expect(storage_client).not_to receive(:multipart_upload)

            expect(result).to be_success
            expect(result.payload).to eq({})
          end
        end

        context 'when images are already in s3' do
          let(:upload_secret_2) { '9cb61a79ce884d5b681dd42728d3c159' }
          let(:image_file_name_2) { 'tanuki_2.png' }
          let(:upload_path_2) { "/uploads/#{upload_secret_2}/#{image_file_name_2}" }
          let(:markdown_field) { "![tanuki](#{upload_path}) and ![tanuki_2](#{upload_path_2})" }
          let(:status_page_upload_path_2) { StatusPage::Storage.upload_path(issue.iid, upload_secret_2, image_file_name_2) }

          before do
            allow(storage_client).to receive(:list_object_keys).and_return(Set[status_page_upload_path])
          end

          it 'publishes only new images' do
            expect(storage_client).to receive(:multipart_upload).with(status_page_upload_path_2, open_file).once
            expect(storage_client).not_to receive(:multipart_upload).with(status_page_upload_path, open_file)

            expect(result).to be_success
            expect(result.payload).to eq({})
          end
        end
      end
    end
  end
end
