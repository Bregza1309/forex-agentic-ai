-- Change conversation_id from uuid to text so it accepts any string identifier
alter table chat_messages alter column conversation_id type text using conversation_id::text;
