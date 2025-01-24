class NotificationsController < ApplicationController
  def index
    set_page_and_extract_portion_from Current.user.notifications.read.ordered

    if @page.first?
      @unread = Current.user.notifications.unread.ordered
    end
  end
end
