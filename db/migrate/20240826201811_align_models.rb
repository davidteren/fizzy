class AlignModels < ActiveRecord::Migration[8.0]
  def change
    rename_column :boosts, :content, :body
  end
end
