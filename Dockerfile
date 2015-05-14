FROM node:onbuild

RUN mkdir /scripts

COPY . /scripts

RUN npm install

ENTRYPOINT ["node"]

CMD /bin/bash && cd /scripts && ls *.js