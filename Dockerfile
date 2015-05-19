FROM node

RUN mkdir /scripts

COPY . /scripts

WORKDIR /scripts

ENV CSA_USERNAME engg_user1
ENV CSA_PASSWORD secret
ENV CSA_ORG ENGINEERING
ENV CSA_IDM_USERNAME idmTransportUser
ENV CSA_IDM_PASSWORD idmTransportUser
ENV CSA_BASEURL https://vm01:8444/


# this type of config file is built only when the image is built.	
#RUN echo "Building credentials file" &&\
#echo "var creds = {} \n\
#creds.u 		= '$CSA_USERNAME'; \n\
#creds.pw 		= '$CSA_PASSWORD'; \n\
#creds.org 		= '$CSA_ORG'; \n\
#creds.idmU 		= '$CSA_IDM_USERNAME'; \n\
#creds.idmPw 	= '$CSA_IDM_PASSWORD'; \n\
#creds.baseUrl 	= '$CSA_BASEURL'; \n\
#module.exports  = creds;"				>/scripts/creds.js



#**************************
# Create deployment script
#***************************
RUN echo "Building credentials file" &&\
echo " echo \"var creds = {} \n\
creds.u 		= '$CSA_USERNAME'; \n\
creds.pw 		= '$CSA_PASSWORD'; \n\
creds.org 		= '$CSA_ORG'; \n\
creds.idmU 		= '$CSA_IDM_USERNAME'; \n\
creds.idmPw 	= '$CSA_IDM_PASSWORD'; \n\
creds.baseUrl 	= '$CSA_BASEURL'; \n\
module.exports  = creds;\" > creds.js"	 >/tmp/runconfig.sh	&& \	

#**************************
#*  Config Startup Items  
#**************************
chmod +x /tmp/runconfig.sh && \
echo "/tmp/runconfig.sh" >> ~/.bashrc && \
echo "rm -fr /tmp/runconfig.sh" >> ~/.bashrc && \

npm install

CMD /bin/bash